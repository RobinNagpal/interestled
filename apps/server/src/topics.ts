import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  NodeStatus,
  TopicCreateInput,
  TopicStatus,
  newId,
} from "@learnloop/schemas";
import type { GeneratedMapT, TopicT } from "@learnloop/schemas";
import { summarise } from "@learnloop/domain";
import type { AuthEnv } from "./auth";
import type { Db } from "./db";
import { NotFoundError } from "./errors";
import { generateMap } from "./llm";
import type { LlmProvider } from "./llm";
import { toNode, toResumePoint, toTopic } from "./rows";

/** Persist a generated map. Keys become ids here, so edges can be resolved. */
async function saveMap(db: Db, topic: TopicT, map: GeneratedMapT): Promise<void> {
  const ids = new Map(map.nodes.map((node) => [node.key, newId()]));
  await db.$transaction([
    db.learningNode.createMany({
      data: map.nodes.map((node, index) => ({
        id: ids.get(node.key)!,
        topicId: topic.id,
        title: node.title,
        claim: node.claim,
        minutes: node.minutes,
        archetype: map.archetype,
        orderIndex: index,
        status: NodeStatus.Untouched,
        capability: node.capability,
      })),
    }),
    db.nodePrerequisite.createMany({
      data: map.nodes.flatMap((node) =>
        node.prerequisiteKeys
          // A model sometimes names a key it did not create; drop rather than fail.
          .filter((key) => ids.has(key) && key !== node.key)
          .map((key) => ({ nodeId: ids.get(node.key)!, prerequisiteId: ids.get(key)! })),
      ),
      skipDuplicates: true,
    }),
    db.topic.update({
      where: { id: topic.id },
      data: { archetype: map.archetype, status: TopicStatus.Ready },
    }),
  ]);
}

/**
 * Generate and store the map. Returns null on success, or the message to show
 * the learner — the topic row always survives, so a failure is visible and
 * retryable rather than the create silently vanishing.
 */
async function buildMap(db: Db, provider: LlmProvider, topic: TopicT): Promise<string | null> {
  try {
    const map = await generateMap(provider, {
      title: topic.title,
      goal: topic.goal,
      timeBudget: topic.timeBudget,
      knownDomains: topic.knownDomains,
    });
    await saveMap(db, topic, map);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    await db.topic.update({
      where: { id: topic.id },
      data: { status: TopicStatus.Failed, error: message },
    });
    return message;
  }
}

export function topicsRouter(db: Db, provider: () => LlmProvider): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/", async (c) => {
    const rows = await db.topic.findMany({
      where: { userId: c.get("userId") },
      orderBy: { createdAt: "desc" },
    });
    return c.json(rows.map(toTopic));
  });

  /**
   * Creating a topic generates its map inline. It is one call and the learner
   * has nothing to do until it lands, so a background job would only add a
   * polling screen — the client shows a skeleton instead.
   */
  router.post("/", zValidator("json", TopicCreateInput), async (c) => {
    const input = c.req.valid("json");
    const created = await db.topic.create({
      data: {
        id: newId(),
        userId: c.get("userId"),
        title: input.title,
        goal: input.goal,
        // Overwritten by the generated map; a placeholder keeps the column typed.
        archetype: "tool",
        timeBudget: input.timeBudget,
        knownDomains: input.knownDomains,
        status: TopicStatus.Generating,
      },
    });
    const failure = await buildMap(db, provider(), toTopic(created));
    if (failure !== null) {
      return c.json({ error: failure, topicId: created.id }, 502);
    }
    return c.json(toTopic(await db.topic.findUniqueOrThrow({ where: { id: created.id } })), 201);
  });

  /** Re-run generation for a topic whose map failed to build. */
  router.post("/:id/retry", async (c) => {
    const topic = await db.topic.findFirst({
      where: { id: c.req.param("id"), userId: c.get("userId") },
    });
    if (topic === null) {
      throw new NotFoundError("Topic not found");
    }
    // Nodes from a partially-saved run would collide with the new ones, and the
    // cascade takes their cards and drills with them.
    await db.learningNode.deleteMany({ where: { topicId: topic.id } });
    await db.topic.update({
      where: { id: topic.id },
      data: { status: TopicStatus.Generating, error: null },
    });
    const failure = await buildMap(db, provider(), toTopic(topic));
    if (failure !== null) {
      return c.json({ error: failure, topicId: topic.id }, 502);
    }
    return c.json(toTopic(await db.topic.findUniqueOrThrow({ where: { id: topic.id } })));
  });

  /** The map, its progress, and the restore point — everything the topic screen needs. */
  router.get("/:id", async (c) => {
    const topic = await db.topic.findFirst({
      where: { id: c.req.param("id"), userId: c.get("userId") },
    });
    if (topic === null) {
      throw new NotFoundError("Topic not found");
    }
    const rows = await db.learningNode.findMany({
      where: { topicId: topic.id },
      include: { prerequisites: { select: { prerequisiteId: true } } },
      orderBy: { orderIndex: "asc" },
    });
    const nodes = rows.map(toNode);
    const resume = await db.resumePoint.findUnique({
      where: { userId_topicId: { userId: c.get("userId"), topicId: topic.id } },
    });
    return c.json({
      topic: toTopic(topic),
      nodes,
      progress: summarise(nodes),
      resume: resume === null ? null : toResumePoint(resume),
    });
  });

  router.delete("/:id", async (c) => {
    const result = await db.topic.deleteMany({
      where: { id: c.req.param("id"), userId: c.get("userId") },
    });
    if (result.count === 0) {
      throw new NotFoundError("Topic not found");
    }
    return c.body(null, 204);
  });

  return router;
}
