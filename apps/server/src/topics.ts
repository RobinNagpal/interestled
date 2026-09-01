import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  MAX_NODE_MINUTES,
  MoveDirection,
  MoveDirectionSchema,
  SUMMARY_MAX,
  TopicContentSettingsInput,
  TopicCreateInput,
  TopicInfoInput,
  TopicRegenerateInput,
  TopicStatus,
  TopicSummary,
  contentSettingsOf,
  newId,
  uniqueSlug,
} from "@interestled/schemas";
import type { GeneratedMapT, LearningNodeT, MapLevels, TopicT } from "@interestled/schemas";
import { ancestorsOf, isBranch } from "@interestled/domain";
import { z } from "zod";
import type { AuthEnv } from "./auth";
import type { Db } from "./db";
import { ConflictError, NotFoundError } from "./errors";
import { DEFAULT_CONTENT_INSTRUCTIONS, generateMap, generateSubtree } from "./llm";
import type { LlmProvider } from "./llm";
import { insertNodes, loadTopicDetail, prepareNodes } from "./maps";
import { loadProfile } from "./profile";
import { toNode, toTopic } from "./rows";

/** Persist a generated map, replacing whatever the topic had before. */
async function saveMap(db: Db, topic: TopicT, map: GeneratedMapT, levels: MapLevels): Promise<void> {
  const { rows, edges } = prepareNodes({
    topicId: topic.id,
    archetype: map.archetype,
    generated: map.nodes,
    parentId: null,
    parentPath: null,
    takenSlugs: new Set(),
    firstOrderIndex: 0,
  });
  await insertNodes(db, rows);
  await db.nodePrerequisite.createMany({ data: edges, skipDuplicates: true });
  await db.topic.update({
    where: { id: topic.id },
    data: { archetype: map.archetype, levels, status: TopicStatus.Ready },
  });
}

/**
 * Generating a map is the only expensive call in the product, and registration
 * is open, so without a ceiling anyone could burn the deployment's model budget
 * by looping topic creation. These are per user; the edge still needs a limit
 * on registration itself before this is exposed publicly (see deployment/README).
 */
const MAX_TOPICS_PER_HOUR = 10;
const MAX_TOPICS_PER_USER = 100;
/**
 * Regenerating does not create a topic, so counting topics would have left every
 * rebuild — of a whole map, or of one group, as often as you like — outside the
 * budget entirely. Nodes are what a generation actually produces, so they are
 * what gets counted, and a big map costs more of the allowance than a small one.
 */
const MAX_GENERATED_NODES_PER_HOUR = 400;

async function assertWithinBudget(db: Db, userId: string, isNewTopic: boolean): Promise<void> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recentTopics, totalTopics, recentNodes] = await Promise.all([
    isNewTopic ? db.topic.count({ where: { userId, createdAt: { gte: hourAgo } } }) : Promise.resolve(0),
    isNewTopic ? db.topic.count({ where: { userId } }) : Promise.resolve(0),
    db.learningNode.count({ where: { topic: { userId }, createdAt: { gte: hourAgo } } }),
  ]);
  if (isNewTopic && recentTopics >= MAX_TOPICS_PER_HOUR) {
    throw new ConflictError(
      `That is ${MAX_TOPICS_PER_HOUR} new topics in an hour — the limit resets shortly.`,
    );
  }
  if (isNewTopic && totalTopics >= MAX_TOPICS_PER_USER) {
    throw new ConflictError(`You have reached ${MAX_TOPICS_PER_USER} topics. Delete one to add another.`);
  }
  if (recentNodes >= MAX_GENERATED_NODES_PER_HOUR) {
    throw new ConflictError("That is a lot of map building in one hour — the limit resets shortly.");
  }
}

/**
 * The first line of the goal, as the topic's opening summary. The topics list
 * has to say something about a topic without opening it, and this is what that
 * list already showed — so a new topic reads the same as it used to and the
 * learner edits it from there, rather than being asked for one more answer
 * before the map they came for (A14).
 */
function summaryFromGoal(goal: string): string {
  // Cut before it is parsed: a first line past the limit is a long goal, not a
  // bad one, and refusing the whole create over a derived field would be absurd.
  return TopicSummary.parse((goal.split("\n")[0] ?? "").trim().slice(0, SUMMARY_MAX));
}

/** A slug that is free for this user. Topic titles repeat, so this is normal. */
async function freeTopicSlug(db: Db, userId: string, title: string): Promise<string> {
  const rows = await db.topic.findMany({ where: { userId }, select: { slug: true } });
  return uniqueSlug(title, new Set(rows.map((row) => row.slug)), "topic-map");
}

async function findTopic(db: Db, userId: string, slug: string): Promise<TopicT> {
  const row = await db.topic.findFirst({ where: { userId, slug } });
  if (row === null) {
    throw new NotFoundError("Topic not found");
  }
  return toTopic(row);
}

/**
 * Generate and store the map. Returns null on success, or the message to show
 * the learner — the topic row always survives, so a failure is visible and
 * retryable rather than the create silently vanishing.
 */
async function buildMap(
  db: Db,
  provider: LlmProvider,
  topic: TopicT,
  levels: MapLevels,
  instructions: string,
): Promise<string | null> {
  try {
    const map = await generateMap(provider, {
      title: topic.title,
      goal: topic.goal,
      timeBudget: topic.timeBudget,
      level: topic.level,
      levels,
      content: contentSettingsOf(topic),
      instructions,
      // Read here rather than passed in, so a rebuild picks up a profile edited
      // since the topic was created — which is a common reason to rebuild.
      profile: await loadProfile(db, topic.userId),
    });
    await saveMap(db, topic, map, levels);
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

const Instructions = z.object({ instructions: z.string().trim().max(600).default("") });

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
   * The default content instructions, so the settings screen can show what is in
   * force before the learner has written anything. It is a prompt, so it lives
   * in src/llm/prompts as Markdown and is read from there rather than copied
   * into the client — one of them would go stale, and it would be this one.
   *
   * Registered before "/:slug", and "defaults" is a reserved slug, so no topic
   * can ever be parked behind this address.
   */
  router.get("/defaults", (c) =>
    // Taken from the input schema rather than restated, so there is one place a
    // default can be changed and no way for the screen to show a different one
    // from the one a save would actually apply.
    c.json({
      ...TopicContentSettingsInput.parse({}),
      contentInstructions: DEFAULT_CONTENT_INSTRUCTIONS,
    }),
  );

  /**
   * Creating a topic generates its map inline. It is one call and the learner
   * has nothing to do until it lands, so a background job would only add a
   * polling screen — the client shows a skeleton instead.
   */
  router.post("/", zValidator("json", TopicCreateInput), async (c) => {
    const input = c.req.valid("json");
    const userId = c.get("userId");
    await assertWithinBudget(db, userId, true);
    const created = await db.topic.create({
      data: {
        id: newId(),
        userId,
        slug: await freeTopicSlug(db, userId, input.title),
        title: input.title,
        summary: summaryFromGoal(input.goal),
        goal: input.goal,
        // Overwritten by the generated map; a placeholder keeps the column typed.
        archetype: "tool",
        timeBudget: input.timeBudget,
        level: input.level,
        levels: input.levels,
        status: TopicStatus.Generating,
      },
    });
    const failure = await buildMap(db, provider(), toTopic(created), input.levels, "");
    if (failure !== null) {
      return c.json({ error: failure, topicSlug: created.slug }, 502);
    }
    return c.json(toTopic(await db.topic.findUniqueOrThrow({ where: { id: created.id } })), 201);
  });

  /**
   * Build the map again — after a failure, or because the learner read it and
   * wants it different. The instructions are their words, passed to the model
   * verbatim; the level count is only changed when they changed it.
   */
  router.post("/:slug/regenerate", zValidator("json", TopicRegenerateInput), async (c) => {
    const userId = c.get("userId");
    const topic = await findTopic(db, userId, c.req.param("slug"));
    const input = c.req.valid("json");
    const levels = input.levels ?? topic.levels;
    await assertWithinBudget(db, userId, false);
    // Nodes from the previous map would collide with the new ones on the path
    // constraint, and the cascade takes their cards and drills with them.
    await db.learningNode.deleteMany({ where: { topicId: topic.id } });
    await db.topic.update({
      where: { id: topic.id },
      data: { status: TopicStatus.Generating, error: null, levels },
    });
    const failure = await buildMap(db, provider(), topic, levels, input.instructions);
    if (failure !== null) {
      return c.json({ error: failure, topicSlug: topic.slug }, 502);
    }
    return c.json(toTopic(await db.topic.findUniqueOrThrow({ where: { id: topic.id } })));
  });

  /** The map, its progress, and the restore point — the whole topic screen. */
  router.get("/:slug", async (c) => {
    const userId = c.get("userId");
    const topic = await findTopic(db, userId, c.req.param("slug"));
    return c.json(await loadTopicDetail(db, userId, topic));
  });

  /**
   * What the topic is and what the learner wants from it. None of it regenerates
   * anything: the answers change what the *next* generation reads, and the map
   * already on screen is left exactly as it was — rebuilding on an edit would
   * throw away every node already verified, which is the one thing the edit
   * screen exists to avoid.
   */
  router.put("/:slug/info", zValidator("json", TopicInfoInput), async (c) => {
    const userId = c.get("userId");
    const topic = await findTopic(db, userId, c.req.param("slug"));
    const input = c.req.valid("json");
    const updated = await db.topic.update({
      where: { id: topic.id },
      data: {
        title: input.title,
        // Kept rather than re-derived: an empty box means the learner cleared it,
        // and re-seeding from the goal would put back what they just deleted.
        summary: input.summary,
        goal: input.goal,
        level: input.level,
        timeBudget: input.timeBudget,
      },
    });
    return c.json(toTopic(updated));
  });

  /**
   * Standing instructions for everything generated inside this topic. Cards
   * already written are dropped, because a setting whose effect you cannot see
   * until you happen to open an unread node is one nobody can tell is working —
   * and a card costs one call to write again.
   *
   * Drills are deliberately kept. Deleting one cascades to the attempts made
   * against it, and those are the learner's own record of what they answered.
   */
  router.put("/:slug/content-settings", zValidator("json", TopicContentSettingsInput), async (c) => {
    const userId = c.get("userId");
    const topic = await findTopic(db, userId, c.req.param("slug"));
    const input = c.req.valid("json");
    const unchanged =
      input.style === topic.style &&
      input.contentInstructions === topic.contentInstructions &&
      input.averageReadTime === topic.averageReadTime;
    if (unchanged) {
      return c.json(topic);
    }
    const updated = await db.topic.update({ where: { id: topic.id }, data: input });
    await db.conceptCard.deleteMany({ where: { node: { topicId: topic.id } } });
    if (input.averageReadTime !== topic.averageReadTime) {
      await rescaleMinutes(db, topic.id, topic.averageReadTime, input.averageReadTime);
    }
    return c.json(toTopic(updated));
  });

  router.delete("/:slug", async (c) => {
    const result = await db.topic.deleteMany({
      where: { slug: c.req.param("slug"), userId: c.get("userId") },
    });
    if (result.count === 0) {
      throw new NotFoundError("Topic not found");
    }
    return c.body(null, 204);
  });

  /**
   * Rebuild what sits under one group. Everything else on the map — including
   * the learner's status on every node outside this group — is untouched, which
   * is the point: a map you can correct in one place is one you keep, and
   * "regenerate everything" is a thing people only press once.
   */
  router.post("/:slug/nodes/:nodeId/regenerate", zValidator("json", Instructions), async (c) => {
    const userId = c.get("userId");
    const topic = await findTopic(db, userId, c.req.param("slug"));
    const { nodes, node } = await loadMapNode(db, topic, c.req.param("nodeId"));
    if (!isBranch(node, nodes)) {
      throw new ConflictError("That is a node, not a group — there is nothing under it to rebuild.");
    }
    await assertWithinBudget(db, userId, false);

    const childLevels = topic.levels - node.depth;
    const siblings = nodes.filter(
      (candidate) => candidate.parentId === node.parentId && candidate.id !== node.id,
    );
    const generated = await generateSubtree(
      provider(),
      {
        topic,
        trail: [...ancestorsOf(node, nodes).map((row) => row.title), node.title],
        claim: node.claim,
        siblingTitles: siblings.map((row) => row.title),
        childLevels,
        profile: await loadProfile(db, userId),
        instructions: c.req.valid("json").instructions,
      },
      node.id,
      node.depth + 1,
    );
    const { rows, edges } = prepareNodes({
      topicId: topic.id,
      archetype: topic.archetype,
      generated,
      parentId: node.id,
      parentPath: node.path,
      takenSlugs: new Set(),
      firstOrderIndex: 0,
    });
    // Delete first: the replacement reuses slugs, so both sets cannot be present
    // at once. The cascade takes the old cards, drills and review items too.
    await db.learningNode.deleteMany({ where: { parentId: node.id } });
    await insertNodes(db, rows);
    await db.nodePrerequisite.createMany({ data: edges, skipDuplicates: true });
    return c.json(await loadTopicDetail(db, userId, topic));
  });

  /**
   * Move a node one place among its siblings. Order is per level, so this swaps
   * exactly two rows and every other level keeps the order it had.
   */
  router.put(
    "/:slug/nodes/:nodeId/move",
    zValidator("json", z.object({ direction: MoveDirectionSchema })),
    async (c) => {
      const userId = c.get("userId");
      const topic = await findTopic(db, userId, c.req.param("slug"));
      const { nodes, node } = await loadMapNode(db, topic, c.req.param("nodeId"));
      const siblings = nodes
        .filter((candidate) => candidate.parentId === node.parentId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const at = siblings.findIndex((candidate) => candidate.id === node.id);
      const swapWith = siblings[c.req.valid("json").direction === MoveDirection.Up ? at - 1 : at + 1];
      // Already at the end of its level: answering with the map unchanged beats
      // an error, because the button is simply a no-op there.
      if (swapWith !== undefined) {
        await db.$transaction([
          db.learningNode.update({ where: { id: node.id }, data: { orderIndex: swapWith.orderIndex } }),
          db.learningNode.update({ where: { id: swapWith.id }, data: { orderIndex: node.orderIndex } }),
        ]);
      }
      return c.json(await loadTopicDetail(db, userId, topic));
    },
  );

  /** Delete a node, and everything under it. */
  router.delete("/:slug/nodes/:nodeId", async (c) => {
    const userId = c.get("userId");
    const topic = await findTopic(db, userId, c.req.param("slug"));
    const { node } = await loadMapNode(db, topic, c.req.param("nodeId"));
    // The self-relation cascades, so children, cards, drills and review items
    // all go with it. Nothing here is recoverable, which the client says first.
    await db.learningNode.delete({ where: { id: node.id } });
    return c.json(await loadTopicDetail(db, userId, topic));
  });

  return router;
}

/** One node plus the whole map it belongs to — every edit needs both. */
async function loadMapNode(
  db: Db,
  topic: TopicT,
  nodeId: string,
): Promise<{ nodes: LearningNodeT[]; node: LearningNodeT }> {
  const rows = await db.learningNode.findMany({
    where: { topicId: topic.id },
    include: { prerequisites: { select: { prerequisiteId: true } } },
    orderBy: { orderIndex: "asc" },
  });
  const nodes = rows.map(toNode);
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined) {
    throw new NotFoundError("Node not found");
  }
  return { nodes, node };
}


/**
 * Move the map's own minute estimates when the learner changes how long a node
 * should take.
 *
 * Without this the setting is half-applied: the next card is written to ten
 * minutes while every row on the map still says three, and the map is then
 * lying about what it costs — the one thing it may never do. The estimates are
 * scaled rather than flattened, so a node the model judged twice the length of
 * its neighbours stays twice the length of them.
 *
 * Branches are left alone: their time is the sum of the leaves under them, and
 * a heading is not something anybody sits down and reads.
 */
async function rescaleMinutes(
  db: Db,
  topicId: string,
  from: number,
  to: number,
): Promise<void> {
  const rows = await db.learningNode.findMany({ where: { topicId } });
  const parents = new Set(rows.map((row) => row.parentId).filter((id): id is string => id !== null));
  const factor = to / Math.max(1, from);
  const updates = rows
    .filter((row) => !parents.has(row.id) && row.minutes > 0)
    .map((row) => ({
      id: row.id,
      was: row.minutes,
      minutes: Math.max(1, Math.min(MAX_NODE_MINUTES, Math.round(row.minutes * factor))),
    }))
    .filter((row) => row.minutes !== row.was);
  if (updates.length === 0) {
    return;
  }
  await db.$transaction(
    updates.map((row) =>
      db.learningNode.update({ where: { id: row.id }, data: { minutes: row.minutes } }),
    ),
  );
}
