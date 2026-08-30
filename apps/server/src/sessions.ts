import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Id, NodeStatus, newId } from "@learnloop/schemas";
import { composeSession, contractLine, isEarned, summarise } from "@learnloop/domain";
import type { AuthEnv } from "./auth";
import type { Db } from "./db";
import { NotFoundError } from "./errors";
import { toNode, toStudySession } from "./rows";

const StartInput = z.object({
  topicId: Id,
  /** Bounded by the learner before starting, so the cost is known up front. */
  minutes: z.number().int().min(3).max(60).default(12),
});

const ResumeInput = z.object({
  topicId: Id,
  nodeId: Id,
  drillId: Id.nullable().default(null),
  draft: z.string().max(4000).default(""),
  lastThought: z.string().max(300).default(""),
});

export function sessionsRouter(db: Db): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  /** Plan the session and state the contract before anything else happens. */
  router.post("/", zValidator("json", StartInput), async (c) => {
    const userId = c.get("userId");
    const { topicId, minutes } = c.req.valid("json");
    const topic = await db.topic.findFirst({ where: { id: topicId, userId } });
    if (topic === null) {
      throw new NotFoundError("Topic not found");
    }
    const nodes = (
      await db.learningNode.findMany({
        where: { topicId },
        include: { prerequisites: { select: { prerequisiteId: true } } },
        orderBy: { orderIndex: "asc" },
      })
    ).map(toNode);
    const dueCount = await db.atom.count({ where: { userId, dueAt: { lte: new Date() } } });
    const steps = composeSession(nodes, minutes, dueCount > 0);
    const contract = contractLine(steps, nodes);
    const created = await db.studySession.create({
      data: { id: newId(), userId, topicId, contract, plannedMinutes: minutes },
    });
    return c.json({ session: toStudySession(created), contract, steps }, 201);
  });

  /**
   * The closing artefact: what they can now do, what they got wrong, what is
   * next. Stated as capability rather than material covered.
   */
  router.post("/:id/end", async (c) => {
    const userId = c.get("userId");
    const row = await db.studySession.findFirst({ where: { id: c.req.param("id"), userId } });
    if (row === null) {
      throw new NotFoundError("Session not found");
    }
    const nodes = (
      await db.learningNode.findMany({
        where: { topicId: row.topicId },
        include: { prerequisites: { select: { prerequisiteId: true } } },
        orderBy: { orderIndex: "asc" },
      })
    ).map(toNode);
    const attempts = await db.attempt.findMany({
      where: { userId, createdAt: { gte: row.startedAt } },
      orderBy: { createdAt: "asc" },
    });
    const gotWrong = attempts
      .map((attempt) => {
        const verdict = attempt.verdict as { misconception?: string } | null;
        return verdict?.misconception ?? "";
      })
      .filter((text) => text.length > 0);

    const ended = await db.studySession.update({
      where: { id: row.id },
      data: { endedAt: new Date(), nodesCompleted: nodes.filter((node) => isEarned(node.status)).length },
    });
    return c.json({
      session: toStudySession(ended),
      capabilities: summarise(nodes).capabilities,
      gotWrong,
      nextNodes: nodes
        .filter((node) => node.status === NodeStatus.Untouched)
        .slice(0, 3)
        .map((node) => ({ id: node.id, title: node.title, minutes: node.minutes })),
    });
  });

  /**
   * The restore point. Written on every keystroke, so stopping mid-sentence
   * costs nothing and there is never a reason to avoid starting.
   */
  router.put("/resume", zValidator("json", ResumeInput), async (c) => {
    const userId = c.get("userId");
    const input = c.req.valid("json");
    const topic = await db.topic.findFirst({ where: { id: input.topicId, userId } });
    if (topic === null) {
      throw new NotFoundError("Topic not found");
    }
    const saved = await db.resumePoint.upsert({
      where: { userId_topicId: { userId, topicId: input.topicId } },
      create: { userId, ...input },
      update: {
        nodeId: input.nodeId,
        drillId: input.drillId,
        draft: input.draft,
        lastThought: input.lastThought,
      },
    });
    return c.json(saved);
  });

  return router;
}
