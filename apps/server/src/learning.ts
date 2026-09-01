import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  AttemptInput,
  CardContent,
  CardDepth,
  DepthAction,
  DepthActionSchema,
  DrillKind,
  DrillKindSchema,
  NodeStatus,
  NodeStatusSchema,
  contentSettingsOf,
  newId,
} from "@interestled/schemas";
import type { CardContentT, LearningNodeT, TopicT } from "@interestled/schemas";
import { advance, depthAfter, masteryDrill, missingPrerequisites, nextDefaultDepth } from "@interestled/domain";
import type { AuthEnv } from "./auth";
import type { Db } from "./db";
import { ConflictError, NotFoundError } from "./errors";
import { generateAtoms, generateCard, generateDrill, gradeAttempt } from "./llm";
import type { LlmProvider } from "./llm";
import { loadProfile } from "./profile";
import { toDrill, toNode, toTopic } from "./rows";

/** Variants that ask the same depth a different way, so they cache separately. */
const BASE_VARIANT = "base";

function variantFor(action: DepthAction | undefined): string {
  if (action === undefined || action === DepthAction.Simpler || action === DepthAction.Deeper) {
    return BASE_VARIANT;
  }
  return action;
}

async function loadNode(
  db: Db,
  userId: string,
  nodeId: string,
): Promise<{ node: LearningNodeT; topic: TopicT }> {
  const row = await db.learningNode.findFirst({
    where: { id: nodeId, topic: { userId } },
    include: { prerequisites: { select: { prerequisiteId: true } }, topic: true },
  });
  if (row === null) {
    throw new NotFoundError("Node not found");
  }
  return { node: toNode(row), topic: toTopic(row.topic) };
}

/**
 * A group has no card and no drill — it is a heading, and the screens route to
 * its children instead. Refusing here rather than trusting the client is worth
 * the line: generating a card is a model call, and a deep link to a group URL is
 * the kind of thing that happens by hand.
 */
async function refuseGroup(db: Db, node: LearningNodeT): Promise<void> {
  const children = await db.learningNode.count({ where: { parentId: node.id } });
  if (children > 0) {
    throw new ConflictError(`"${node.title}" is a group. Open one of the nodes inside it.`);
  }
}

/**
 * Cards are cached per (node, depth, variant), which is what lets a depth button
 * answer instantly instead of costing a wait — and a depth control that costs a
 * wait is one nobody presses.
 *
 * The cache is per learner without needing to say so in the key: a node belongs
 * to one topic, which belongs to one user, so no two accounts ever share a node
 * id. That is what makes it safe to write the card against this learner's
 * profile. It also means an edited profile does not rewrite cards already
 * generated — the same as changing the topic's own answers.
 */
async function cardFor(
  db: Db,
  provider: LlmProvider,
  userId: string,
  topic: TopicT,
  node: LearningNodeT,
  depth: number,
  variant: string,
): Promise<CardContentT> {
  const cached = await db.conceptCard.findUnique({
    where: { nodeId_depth_variant: { nodeId: node.id, depth, variant } },
  });
  if (cached !== null) {
    return CardContent.parse(cached.content);
  }
  // Read only on a miss. A hit is the normal case, and neither the profile nor
  // the rest of the map is needed anywhere but the prompt, so this must not
  // become two queries on every card view.
  const [profile, rows] = await Promise.all([
    loadProfile(db, userId),
    db.learningNode.findMany({ where: { topicId: topic.id } }),
  ]);
  // The whole map goes to the prompt: a card written from its own title alone
  // re-explains the nodes before it and spends the ones after it.
  const content = await generateCard(provider, {
    topic,
    node,
    nodes: rows.map(toNode),
    depth,
    variant,
    profile,
  });
  // Two concurrent readers of the same uncached card both generate, and the
  // slower insert would collide on the unique key. The row is identical either
  // way, so treat the collision as the cache hit it effectively is.
  await db.conceptCard.upsert({
    where: { nodeId_depth_variant: { nodeId: node.id, depth, variant } },
    create: { id: newId(), nodeId: node.id, depth, variant, content },
    update: {},
  });
  return content;
}

const CardQuery = z.object({
  depth: z.coerce.number().int().min(1).max(5).optional(),
  action: DepthActionSchema.optional(),
});

export function learningRouter(db: Db, provider: () => LlmProvider): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  /**
   * Opening a node marks it Seen and nothing more. Reading can never complete a
   * node, or the map stops being honest and everything resting on it collapses.
   */
  router.get("/:id/card", zValidator("query", CardQuery), async (c) => {
    const userId = c.get("userId");
    const { node, topic } = await loadNode(db, userId, c.req.param("id"));
    await refuseGroup(db, node);
    const query = c.req.valid("query");
    const base = CardDepth.parse(query.depth ?? c.get("defaultDepth"));
    const depth = query.action === undefined ? base : depthAfter(base, query.action);
    const variant = variantFor(query.action);

    const content = await cardFor(db, provider(), userId, topic, node, depth, variant);

    if (node.status === NodeStatus.Untouched) {
      await db.learningNode.update({ where: { id: node.id }, data: { status: NodeStatus.Seen } });
    }
    // Depth follows the learner rather than resetting per node.
    if (depth !== c.get("defaultDepth")) {
      await db.user.update({
        where: { id: userId },
        data: { defaultDepth: nextDefaultDepth(CardDepth.parse(c.get("defaultDepth")), depth) },
      });
    }

    const all = await db.learningNode.findMany({
      where: { topicId: topic.id },
      include: { prerequisites: { select: { prerequisiteId: true } } },
    });
    return c.json({
      node: { ...node, status: node.status === NodeStatus.Untouched ? NodeStatus.Seen : node.status },
      depth,
      variant,
      content,
      // Advisory, never a gate: shown as a note with a link on the node itself.
      missingPrerequisites: missingPrerequisites(node, all.map(toNode)).map((row) => ({
        id: row.id,
        title: row.title,
        minutes: row.minutes,
      })),
    });
  });

  /** A drill of the requested kind, generated once per node and then reused. */
  router.get("/:id/drill", zValidator("query", z.object({ kind: DrillKindSchema.optional() })), async (c) => {
    const userId = c.get("userId");
    const { node, topic } = await loadNode(db, userId, c.req.param("id"));
    await refuseGroup(db, node);
    const kind = c.req.valid("query").kind ?? masteryDrill(node.archetype);

    const existing = await db.drill.findFirst({ where: { nodeId: node.id, kind } });
    if (existing !== null) {
      return c.json(toDrill(existing));
    }
    const depth = CardDepth.parse(c.get("defaultDepth"));
    const card = await cardFor(db, provider(), userId, topic, node, depth, BASE_VARIANT);
    const generated = await generateDrill(provider(), {
      node,
      kind,
      card,
      content: contentSettingsOf(topic),
    });
    const created = await db.drill.create({
      data: { id: newId(), nodeId: node.id, kind, ...generated },
    });
    return c.json(toDrill(created));
  });

  /**
   * Grade an answer. This is the one call that is never cached: a cached verdict
   * would be a verdict on somebody else's answer.
   */
  router.post("/attempts", zValidator("json", AttemptInput), async (c) => {
    const userId = c.get("userId");
    const drillRow = await db.drill.findFirst({
      where: { id: c.req.valid("json").drillId, node: { topic: { userId } } },
      include: { node: { include: { prerequisites: { select: { prerequisiteId: true } }, topic: true } } },
    });
    if (drillRow === null) {
      throw new NotFoundError("Drill not found");
    }
    const input = c.req.valid("json");
    const drill = toDrill(drillRow);
    const node = toNode(drillRow.node);
    const topic = toTopic(drillRow.node.topic);

    const verdict = await gradeAttempt(provider(), {
      prompt: drill.prompt,
      referencePoints: drill.referencePoints,
      response: input.response,
    });

    const status = advance(node.status, verdict, {
      // The archetype decides which drill means "known", so a System topic
      // reaches Verified through Predict and a Tool topic through Apply.
      isMastery: drill.kind === masteryDrill(node.archetype),
      // A wrong guess before the reveal never costs the learner anything.
      penalise: drill.kind !== DrillKind.Predict,
    });
    const [attempt] = await db.$transaction([
      db.attempt.create({
        data: {
          id: newId(),
          drillId: drill.id,
          userId,
          response: input.response,
          verdict,
          hintsUsed: input.hintsUsed,
        },
      }),
      db.learningNode.update({ where: { id: node.id }, data: { status } }),
    ]);

    // Review items are extracted the first time a node is passed, so the
    // retention layer fills itself without a separate step.
    if (verdict.passed) {
      const existing = await db.atom.count({ where: { nodeId: node.id, userId } });
      if (existing === 0) {
        // Deliberately swallowed: the answer is already graded and the node has
        // already moved, so a model failure here must not turn a successful
        // attempt into an error the learner sees. The next pass retries it.
        await createAtoms(db, provider(), userId, topic, node).catch((error: unknown) => {
          console.error("atom extraction failed", error);
        });
      }
    }
    return c.json({ attempt: { ...attempt, verdict }, status, capability: node.capability }, 201);
  });

  /** Manual status change: "I already know this", honoured without proof. */
  router.put(
    "/:id/status",
    zValidator("json", z.object({ status: NodeStatusSchema })),
    async (c) => {
      const userId = c.get("userId");
      const { node } = await loadNode(db, userId, c.req.param("id"));
      const updated = await db.learningNode.update({
        where: { id: node.id },
        data: { status: c.req.valid("json").status },
        include: { prerequisites: { select: { prerequisiteId: true } } },
      });
      return c.json(toNode(updated));
    },
  );

  return router;
}

async function createAtoms(
  db: Db,
  provider: LlmProvider,
  userId: string,
  topic: TopicT,
  node: LearningNodeT,
): Promise<void> {
  // cardFor already reads the cache, so this is a hit in the normal case.
  const content = await cardFor(db, provider, userId, topic, node, 2, BASE_VARIANT);
  const atoms = await generateAtoms(provider, {
    node,
    card: content,
    content: contentSettingsOf(topic),
  });
  const now = new Date();
  await db.atom.createMany({
    data: atoms.map((atom) => ({
      id: newId(),
      nodeId: node.id,
      userId,
      kind: atom.kind,
      prompt: atom.prompt,
      answer: atom.answer,
      // Due tomorrow: the first retrieval is the one that matters most.
      dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    })),
  });
}
