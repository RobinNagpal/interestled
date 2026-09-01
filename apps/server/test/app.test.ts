import { describe, expect, it, vi } from "vitest";
import {
  CardAngle,
  ContentStyle,
  DEFAULT_AVERAGE_READ_TIME,
  LearningStyle,
  LlmProviderId,
  MAP_QUESTION_KINDS,
  MapPlanView,
  MapQuestionKind,
  NodeStatus,
  ReadTime,
  TimeBudget,
  TopicArchetype,
  TopicStatus,
  cardVariant,
} from "@interestled/schemas";
import { createApp } from "../src/app";
import type { Db } from "../src/db";
import type { LlmProvider } from "../src/llm/types";

/**
 * The auth boundary depends on registration order in app.ts: the public
 * /api/auth routes are mounted before the sub-app that applies requireAuth to
 * "/api/*". Reordering those two lines would silently either lock everyone out
 * of registration or expose every authenticated route, and nothing else in the
 * suite would notice — hence these tests.
 */
/**
 * The profile as stored, and every write made to it. Shared by reference with
 * the returned Db so a test can assert what actually reached the row.
 */
interface ProfileRow {
  age: number | null;
  background: string;
  learningStyles: string[];
}

interface Write {
  id: string;
  data: object;
}

function stubDb(
  session: { token: string; userId: string; expiresAt?: Date } | null,
  profileRow: ProfileRow = { age: null, background: "", learningStyles: [] },
  writes: Write[] = [],
): Db {
  const db = {
    user: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "u1", email: "a@b.com", createdAt: new Date() })),
      // The profile lives on the user row; these two are all /api/profile touches.
      findUniqueOrThrow: vi.fn(async () => ({ ...profileRow })),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: object }) => {
        writes.push({ id: where.id, data });
        Object.assign(profileRow, data);
        return { ...profileRow };
      }),
    },
    authSession: {
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) =>
        session !== null && where.token === session.token
          ? {
              token: session.token,
              userId: session.userId,
              expiresAt: session.expiresAt ?? new Date(Date.now() + 60_000),
              user: { id: session.userId, defaultDepth: 2 },
            }
          : null,
      ),
      create: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    topic: { findMany: vi.fn(async () => []) },
  };
  // The routes under test touch only these three models; the cast is confined
  // to the test so application code keeps its full Prisma types.
  return db as unknown as Db;
}

const provider = (): LlmProvider => ({
  id: LlmProviderId.Gemini,
  model: "test",
  complete: async () => "{}",
});

describe("auth boundary", () => {
  it("lets an anonymous request reach register", async () => {
    const app = createApp(stubDb(null), { provider });
    const response = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", password: "a long enough one" }),
    });
    expect(response.status).toBe(201);
  });

  it("leaves health open, so the load balancer never needs a token", async () => {
    const response = await createApp(stubDb(null), { provider }).request("/health");
    expect(response.status).toBe(200);
  });

  it("rejects an authenticated route with no token", async () => {
    const response = await createApp(stubDb(null), { provider }).request("/api/topics");
    expect(response.status).toBe(401);
  });

  it("rejects a token the server does not know", async () => {
    const app = createApp(stubDb({ token: "good", userId: "u1" }), { provider });
    const response = await app.request("/api/topics", {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(response.status).toBe(401);
  });

  it("rejects a token sent without the Bearer scheme", async () => {
    const app = createApp(stubDb({ token: "good", userId: "u1" }), { provider });
    const response = await app.request("/api/topics", { headers: { Authorization: "good" } });
    expect(response.status).toBe(401);
  });

  it("rejects a token that has expired", async () => {
    const app = createApp(
      stubDb({ token: "good", userId: "u1", expiresAt: new Date(Date.now() - 1000) }),
      { provider },
    );
    const response = await app.request("/api/topics", {
      headers: { Authorization: "Bearer good" },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("expired") });
  });

  it("admits a valid token", async () => {
    const app = createApp(stubDb({ token: "good", userId: "u1" }), { provider });
    const response = await app.request("/api/topics", {
      headers: { Authorization: "Bearer good" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

/** A ready topic, as the row the writes below are made against. */
function topicRow(): Record<string, unknown> {
  return {
    id: "t1",
    userId: "u1",
    slug: "kubernetes",
    title: "Kubernetes",
    summary: "Run a small cluster",
    goal: "deploy a service",
    archetype: TopicArchetype.Tool,
    timeBudget: TimeBudget.Week,
    level: "",
    levels: 2,
    style: ContentStyle.ShortAndCrisp,
    contentInstructions: "",
    averageReadTime: DEFAULT_AVERAGE_READ_TIME,
    status: TopicStatus.Ready,
    error: null,
    createdAt: new Date(),
  };
}

/**
 * The two writes that change what future generations read without touching what
 * has already been built. Both are ownership-scoped like everything else, and
 * neither may reach the map: an edit that regenerated would throw away the nodes
 * the learner has already verified, which is the thing the edit screen exists to
 * avoid.
 */
describe("topic settings writes", () => {
  function settingsDb(row = topicRow()): {
    db: Db;
    updates: object[];
    deletedCards: object[];
    deletedNodes: object[];
    minuteWrites: { id: string; minutes: number }[];
  } {
    const updates: object[] = [];
    const deletedCards: object[] = [];
    const deletedNodes: object[] = [];
    const minuteWrites: { id: string; minutes: number }[] = [];
    const db = {
      authSession: {
        findUnique: vi.fn(async () => ({
          token: "good",
          userId: "u1",
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: "u1", defaultDepth: 2 },
        })),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      topic: {
        findFirst: vi.fn(async () => row),
        update: vi.fn(async ({ data }: { data: object }) => {
          updates.push(data);
          Object.assign(row, data);
          return row;
        }),
      },
      conceptCard: { deleteMany: vi.fn(async (args: object) => { deletedCards.push(args); return { count: 1 }; }) },
      learningNode: {
        deleteMany: vi.fn(async (args: object) => { deletedNodes.push(args); return { count: 0 }; }),
        // A group and two leaves of different lengths, so a rescale can be seen
        // to keep their proportions rather than flattening them.
        findMany: vi.fn(async () => [
          { id: "g1", parentId: null, minutes: 0 },
          { id: "n1", parentId: "g1", minutes: 3 },
          { id: "n2", parentId: "g1", minutes: 5 },
        ]),
        update: vi.fn(({ where, data }: { where: { id: string }; data: { minutes: number } }) => {
          minuteWrites.push({ id: where.id, minutes: data.minutes });
          return { id: where.id };
        }),
      },
      $transaction: vi.fn(async (operations: unknown[]) => operations),
    };
    return { db: db as unknown as Db, updates, deletedCards, deletedNodes, minuteWrites };
  }

  const send = async (db: Db, path: string, body: object): Promise<Response> =>
    createApp(db, { provider }).request(path, {
      method: "PUT",
      headers: { "content-type": "application/json", Authorization: "Bearer good" },
      body: JSON.stringify(body),
    });

  it("saves the goal and summary without touching the map", async () => {
    const { db, updates, deletedNodes } = settingsDb();
    const response = await send(db, "/api/topics/kubernetes/info", {
      title: "Kubernetes",
      summary: "Run and debug a small cluster",
      goal: "deploy a service\nread the logs",
      level: "I use Docker daily",
      timeBudget: TimeBudget.Ongoing,
    });

    expect(response.status).toBe(200);
    expect(updates).toEqual([
      expect.objectContaining({ summary: "Run and debug a small cluster", timeBudget: TimeBudget.Ongoing }),
    ]);
    // No regeneration, and above all no nodes deleted.
    expect(deletedNodes).toEqual([]);
  });

  it("drops the cached cards when the writing settings change", async () => {
    const { db, updates, deletedCards } = settingsDb();
    const response = await send(db, "/api/topics/kubernetes/content-settings", {
      style: ContentStyle.TechnicalAndDeep,
      contentInstructions: "No YAML in the examples",
      averageReadTime: ReadTime.Ten,
    });

    expect(response.status).toBe(200);
    expect(updates).toEqual([
      {
        style: ContentStyle.TechnicalAndDeep,
        contentInstructions: "No YAML in the examples",
        averageReadTime: ReadTime.Ten,
      },
    ]);
    // Every card in the topic, so the next open is written to the new settings.
    expect(deletedCards).toEqual([{ where: { node: { topicId: "t1" } } }]);
  });

  it("moves the map's own minutes when the read time changes", async () => {
    // Half-applying the setting is what made "10 minutes" come back as three:
    // the next card is written to ten while every row still says three, and the
    // node's own estimate then caps the card back down to it.
    const { db, minuteWrites } = settingsDb();
    const response = await send(db, "/api/topics/kubernetes/content-settings", {
      style: ContentStyle.ShortAndCrisp,
      contentInstructions: "",
      averageReadTime: ReadTime.Ten,
    });

    expect(response.status).toBe(200);
    // Scaled from a three-minute average, and capped at the longest sitting the
    // ladder offers. The group keeps its 0: a heading is not something read.
    expect(minuteWrites).toEqual([
      { id: "n1", minutes: 10 },
      { id: "n2", minutes: 15 },
    ]);
  });

  it("leaves the map's minutes alone when only the register changes", async () => {
    const { db, minuteWrites } = settingsDb();
    await send(db, "/api/topics/kubernetes/content-settings", {
      style: ContentStyle.TechnicalAndDeep,
      contentInstructions: "",
      averageReadTime: DEFAULT_AVERAGE_READ_TIME,
    });
    expect(minuteWrites).toEqual([]);
  });

  it("writes nothing, and keeps the cards, when the settings come back unchanged", async () => {
    const { db, updates, deletedCards } = settingsDb();
    const response = await send(db, "/api/topics/kubernetes/content-settings", {
      style: ContentStyle.ShortAndCrisp,
      contentInstructions: "",
      averageReadTime: DEFAULT_AVERAGE_READ_TIME,
    });

    expect(response.status).toBe(200);
    expect(updates).toEqual([]);
    expect(deletedCards).toEqual([]);
  });

  it("refuses a read time that is not a rung on the ladder", async () => {
    const { db } = settingsDb();
    const response = await send(db, "/api/topics/kubernetes/content-settings", {
      style: ContentStyle.ShortAndCrisp,
      contentInstructions: "",
      // Between two rungs rather than off the end: both have to be refused, or
      // the map is built to a length no screen ever offered.
      averageReadTime: 6,
    });
    expect(response.status).toBe(400);
  });
});

describe("validation and error mapping", () => {
  it("refuses a password too short to be worth hashing", async () => {
    const app = createApp(stubDb(null), { provider });
    const response = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "short" }),
    });
    expect(response.status).toBe(400);
  });

  it("refuses an address that is not an address", async () => {
    const app = createApp(stubDb(null), { provider });
    const response = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "nope", password: "a long enough one" }),
    });
    expect(response.status).toBe(400);
  });
});

/**
 * The profile is read by every generation call, so an unrecognised learning
 * style must be refused at the boundary rather than reaching a prompt — and the
 * write must be scoped to the caller, which is the whole authorisation model.
 */
describe("profile", () => {
  const authed = { Authorization: "Bearer good" };
  const session = { token: "good", userId: "u1" };

  it("needs a token, like everything else under /api", async () => {
    const response = await createApp(stubDb(session), { provider }).request("/api/profile");
    expect(response.status).toBe(401);
  });

  it("answers with the stored profile", async () => {
    const row = { age: 34, background: "Mostly Python", learningStyles: [LearningStyle.Examples] };
    const app = createApp(stubDb(session, row), { provider });
    const response = await app.request("/api/profile", { headers: authed });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      age: 34,
      background: "Mostly Python",
      learningStyles: ["examples"],
    });
  });

  it("writes only the row belonging to the token", async () => {
    const writes: Write[] = [];
    const app = createApp(stubDb(session, undefined, writes), { provider });
    const response = await app.request("/api/profile", {
      method: "PUT",
      headers: { ...authed, "content-type": "application/json" },
      body: JSON.stringify({ age: 41, background: " Trims ", learningStyles: ["hands_on"] }),
    });
    expect(response.status).toBe(200);
    expect(writes).toEqual([
      { id: "u1", data: { age: 41, background: "Trims", learningStyles: ["hands_on"] } },
    ]);
  });

  it("keeps a cleared age as null rather than turning it into a zero", async () => {
    const writes: Write[] = [];
    const app = createApp(stubDb(session, { age: 34, background: "", learningStyles: [] }, writes), {
      provider,
    });
    const response = await app.request("/api/profile", {
      method: "PUT",
      headers: { ...authed, "content-type": "application/json" },
      body: JSON.stringify({ age: null, background: "", learningStyles: [] }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ age: null });
  });

  it("refuses a learning style the enum does not have", async () => {
    const app = createApp(stubDb(session), { provider });
    const response = await app.request("/api/profile", {
      method: "PUT",
      headers: { ...authed, "content-type": "application/json" },
      body: JSON.stringify({ age: null, background: "", learningStyles: ["telepathy"] }),
    });
    expect(response.status).toBe(400);
  });

  it("refuses an age no person has", async () => {
    const app = createApp(stubDb(session), { provider });
    const response = await app.request("/api/profile", {
      method: "PUT",
      headers: { ...authed, "content-type": "application/json" },
      body: JSON.stringify({ age: 900, background: "", learningStyles: [] }),
    });
    expect(response.status).toBe(400);
  });

  it("sends each style once, so the prompt cannot repeat one", async () => {
    const writes: Write[] = [];
    const app = createApp(stubDb(session, undefined, writes), { provider });
    await app.request("/api/profile", {
      method: "PUT",
      headers: { ...authed, "content-type": "application/json" },
      body: JSON.stringify({ age: null, background: "", learningStyles: ["visuals", "visuals"] }),
    });
    expect(writes[0]?.data).toMatchObject({ learningStyles: ["visuals"] });
  });
});

/**
 * The card route, end to end against a stub row store. What it is here to catch
 * is the map reaching the prompt: a card written from its own title alone
 * re-explains the nodes before it and spends the ones after it, and nothing else
 * in the suite would notice if the outline stopped being sent.
 */
describe("card generation", () => {
  /** A two-level map: one group, three nodes, the middle one being written. */
  function mapRows(): Record<string, unknown>[] {
    const base = {
      topicId: "t1",
      minutes: 3,
      archetype: TopicArchetype.Tool,
      status: NodeStatus.Untouched,
      capability: "do it",
      createdAt: new Date(),
    };
    const leaf = (id: string, slug: string, title: string, orderIndex: number) => ({
      ...base,
      id,
      parentId: "g1",
      path: `pods/${slug}`,
      title,
      claim: "c",
      orderIndex,
    });
    return [
      // A branch, so minutes 0: nobody sits down and reads a heading.
      { ...base, id: "g1", parentId: null, path: "pods", title: "Pods and containers", claim: "c", minutes: 0, orderIndex: 0 },
      leaf("n1", "what-a-pod-is", "What a pod is", 0),
      leaf("n2", "restarts", "Restarts and probes", 1),
      leaf("n3", "probes-in-anger", "Probes in anger", 2),
    ];
  }

  const CARD = JSON.stringify({
    claim: "A pod is the unit of scheduling.",
    mechanism: ["The scheduler places pods."],
    example: { setup: "3 replicas, one node dies", result: "a new pod in 4s" },
    misconception: { belief: "kubectl creates it", correction: "the controller does" },
    jargon: [],
  });

  function cardDb(rows: Record<string, unknown>[], nodeId: string): { db: Db; statuses: object[] } {
    const statuses: object[] = [];
    const db = {
      authSession: {
        findUnique: vi.fn(async () => ({
          token: "good",
          userId: "u1",
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: "u1", defaultDepth: 2 },
        })),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      user: {
        findUniqueOrThrow: vi.fn(async () => ({ age: null, background: "", learningStyles: [] })),
        // Depth is sticky, so asking for a deeper card writes the new default.
        update: vi.fn(async () => ({ id: "u1", defaultDepth: 3 })),
      },
      learningNode: {
        findFirst: vi.fn(async () => ({
          ...rows.find((row) => row.id === nodeId)!,
          prerequisites: [],
          topic: topicRow(),
        })),
        // A leaf: nothing hangs off it, so it has a card rather than children.
        count: vi.fn(async () => 0),
        findMany: vi.fn(async () => rows.map((row) => ({ ...row, prerequisites: [] }))),
        update: vi.fn(async ({ data }: { data: object }) => {
          statuses.push(data);
          return { ...rows.find((row) => row.id === nodeId)!, ...data, prerequisites: [] };
        }),
      },
      conceptCard: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(async () => ({})),
      },
    };
    return { db: db as unknown as Db, statuses };
  }

  /** Records what actually reached the model. */
  function recording(): { provider: () => LlmProvider; prompts: string[] } {
    const prompts: string[] = [];
    return {
      prompts,
      provider: () => ({
        id: LlmProviderId.Gemini,
        model: "test",
        complete: async (request) => {
          prompts.push(request.prompt);
          return CARD;
        },
      }),
    };
  }

  it("sends the whole map, with this node marked, and marks the node seen", async () => {
    const { db, statuses } = cardDb(mapRows(), "n2");
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      content: { claim: "A pod is the unit of scheduling." },
      node: { status: NodeStatus.Seen },
      // What the card was actually written to, so the controls can say so.
      settings: { depth: 2, minutes: 3, style: ContentStyle.ShortAndCrisp, angle: CardAngle.Base },
    });
    // Reading advances a node to Seen and no further.
    expect(statuses).toEqual([{ status: NodeStatus.Seen }]);

    const prompt = prompts[0] ?? "";
    expect(prompt).toContain("- Pods and containers");
    expect(prompt).toContain("  - What a pod is");
    expect(prompt).toContain("  - Restarts and probes  ← WRITE THIS ONE");
    expect(prompt).toContain("  - Probes in anger");
    expect(prompt).toContain("has been covered already");
  });

  it("carries each control through to the model, and caches them apart", async () => {
    // The four controls under a card are settings the generator reads. A press
    // that does not change the prompt is a button that looks broken, which is
    // what the depth buttons did.
    const { db } = cardDb(mapRows(), "n2");
    const { provider: recorder, prompts } = recording();
    const app = createApp(db, { provider: recorder });
    const response = await app.request(
      `/api/nodes/n2/card?depth=5&minutes=10&style=${ContentStyle.ReferenceNotes}&angle=${CardAngle.WhereThisBreaks}`,
      { headers: { Authorization: "Bearer good" } },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      settings: {
        depth: 5,
        minutes: 10,
        style: ContentStyle.ReferenceNotes,
        angle: CardAngle.WhereThisBreaks,
      },
    });
    const prompt = prompts[0] ?? "";
    expect(prompt).toContain("Depth 5");
    expect(prompt).toContain("about 10 minutes");
    expect(prompt).toContain("something to look up rather than read through");
    expect(prompt).toContain("when this model is wrong");

    // And the row it wrote is keyed by those settings, not by the depth alone.
    const written = (db as unknown as { conceptCard: { upsert: ReturnType<typeof vi.fn> } })
      .conceptCard.upsert.mock.calls[0]?.[0] as
      | { create: { depth: number; variant: string } }
      | undefined;
    expect(written?.create.depth).toBe(5);
    expect(written?.create.variant).toBe(
      cardVariant({
        depth: 5,
        minutes: 10,
        style: ContentStyle.ReferenceNotes,
        angle: CardAngle.WhereThisBreaks,
      }),
    );
  });

  it("refuses a length no card may be written to", async () => {
    const { db } = cardDb(mapRows(), "n2");
    const { provider: recorder } = recording();
    const response = await createApp(db, { provider: recorder }).request(
      "/api/nodes/n2/card?minutes=45",
      { headers: { Authorization: "Bearer good" } },
    );
    expect(response.status).toBe(400);
  });

  it("does not read the map when the card is already cached", async () => {
    const { db } = cardDb(mapRows(), "n2");
    const cached = db as unknown as {
      conceptCard: { findUnique: ReturnType<typeof vi.fn> };
      learningNode: { findMany: ReturnType<typeof vi.fn> };
      user: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    };
    cached.conceptCard.findUnique = vi.fn(async () => ({ content: JSON.parse(CARD) }));
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });

    expect(response.status).toBe(200);
    expect(prompts).toEqual([]);
    // One findMany, for the prerequisite notes — the outline query is on a miss
    // only, or a hit costs a second read of every node in the topic.
    expect(cached.learningNode.findMany).toHaveBeenCalledTimes(1);
    expect(cached.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});

/**
 * The seven choices asked between the create form and the map.
 *
 * Two things are load-bearing and neither is visible from the route alone: an
 * answer only means anything against the four options the learner was shown, so
 * the plan row is what it is read against; and the plan is a model call that
 * happens before any topic or node exists, so the ownership check and the budget
 * counter both have to be its own.
 */
describe("map plans", () => {
  /** Seven questions in the order the enum fixes, as the model would return them. */
  const QUESTIONS = JSON.stringify({
    questions: MAP_QUESTION_KINDS.map((kind) => ({
      kind,
      question: `A question about ${kind}`,
      options: [0, 1, 2, 3].map((index) => ({
        label: `Option ${index} for ${kind}`,
        sample: [`Sample ${index} for ${kind}`],
      })),
    })),
  });

  /** The smallest map the two-level schema accepts: three groups, two nodes each. */
  const MAP = JSON.stringify({
    archetype: TopicArchetype.Tool,
    sections: [0, 1, 2].map((group) => ({
      key: `group_${group}`,
      title: `Group ${group}`,
      claim: "One part of the subject.",
      capability: "read a manifest",
      nodes: [0, 1].map((leaf) => ({
        key: `node_${group}_${leaf}`,
        title: `Node ${group}.${leaf}`,
        claim: "One thing that is true.",
        minutes: 3,
        capability: "say what it does",
        prerequisiteKeys: [],
      })),
    })),
  });

  interface PlanRow {
    id: string;
    userId: string;
    topicId: string | null;
    questions: unknown;
    answers: unknown;
    createdAt: Date;
  }

  function planDb(plans: PlanRow[]): { db: Db; created: Record<string, unknown>[]; plans: PlanRow[] } {
    const created: Record<string, unknown>[] = [];
    const db = {
      authSession: {
        findUnique: vi.fn(async () => ({
          token: "good",
          userId: "u1",
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: "u1", defaultDepth: 2 },
        })),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      user: {
        findUniqueOrThrow: vi.fn(async () => ({ age: null, background: "", learningStyles: [] })),
      },
      mapPlan: {
        count: vi.fn(async () => plans.length),
        create: vi.fn(async ({ data }: { data: PlanRow }) => {
          plans.push({ ...data, answers: [], createdAt: new Date() });
          return data;
        }),
        findFirst: vi.fn(async ({ where }: { where: { id?: string; userId: string; topicId?: string } }) =>
          matching(plans, where)[0] ?? null,
        ),
        findMany: vi.fn(async ({ where }: { where: { id?: string; userId: string; topicId?: string } }) =>
          matching(plans, where),
        ),
        updateMany: vi.fn(
          async ({ where, data }: { where: { id: string }; data: { topicId: string; answers: unknown } }) => {
            const plan = plans.find((candidate) => candidate.id === where.id);
            if (plan !== undefined) {
              Object.assign(plan, data);
            }
            return { count: plan === undefined ? 0 : 1 };
          },
        ),
      },
      topic: {
        count: vi.fn(async () => 0),
        findMany: vi.fn(async () => []),
        findFirst: vi.fn(async () => topicRow()),
        findUniqueOrThrow: vi.fn(async () => topicRow()),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return { ...topicRow(), ...data };
        }),
        update: vi.fn(async () => topicRow()),
      },
      learningNode: {
        count: vi.fn(async () => 0),
        findMany: vi.fn(async () => []),
        createMany: vi.fn(async () => ({ count: 1 })),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      nodePrerequisite: { createMany: vi.fn(async () => ({ count: 0 })) },
    };
    return { db: db as unknown as Db, created, plans };
  }

  /** The rows a Prisma where of {id?, userId, topicId?} would have matched. */
  function matching(
    plans: PlanRow[],
    where: { id?: string; userId: string; topicId?: string },
  ): PlanRow[] {
    return plans.filter(
      (plan) =>
        plan.userId === where.userId &&
        (where.id === undefined || plan.id === where.id) &&
        (where.topicId === undefined || plan.topicId === where.topicId),
    );
  }

  /** Replays the canned replies in order and keeps every prompt sent. */
  function recorder(...replies: string[]): { provider: () => LlmProvider; prompts: string[] } {
    const prompts: string[] = [];
    return {
      prompts,
      provider: () => ({
        id: LlmProviderId.Gemini,
        model: "test",
        complete: async (request) => {
          prompts.push(request.prompt);
          return replies.shift() ?? "";
        },
      }),
    };
  }

  const post = async (
    db: Db,
    provider: () => LlmProvider,
    path: string,
    body: object,
  ): Promise<Response> =>
    createApp(db, { provider }).request(path, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer good" },
      body: JSON.stringify(body),
    });

  it("answers with seven questions and keeps the row they were asked from", async () => {
    const { db, plans } = planDb([]);
    const { provider } = recorder(QUESTIONS);
    const response = await post(db, provider, "/api/topics/questions", {
      title: "Kubernetes",
      goal: "deploy a service",
    });

    expect(response.status).toBe(200);
    // Parsed rather than read loosely: the shape is the contract the client is
    // written against, and MapPlanView is what enforces the seven.
    const body = MapPlanView.parse(await response.json());
    expect(body.questions).toHaveLength(MAP_QUESTION_KINDS.length);
    expect(body.planId).toBe(plans[0]?.id);
    // No topic yet: the learner is answering questions about one that may never
    // be created, which is why the column is nullable.
    expect(plans[0]?.topicId).toBeNull();
  });

  it("builds the map from the sample the learner picked, and records the pick", async () => {
    const { db, plans, created: topics } = planDb([]);
    const { provider, prompts } = recorder(QUESTIONS, MAP);
    const app = createApp(db, { provider });
    const asked = await app.request("/api/topics/questions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer good" },
      body: JSON.stringify({ title: "Kubernetes" }),
    });
    const { planId } = MapPlanView.parse(await asked.json());

    const built = await post(db, provider, "/api/topics", {
      title: "Kubernetes",
      planId,
      answers: [{ kind: MapQuestionKind.Outline, optionIndex: 2 }],
    });

    expect(built.status).toBe(201);
    // The second prompt is the map. What reaches it is the sample, not the label
    // alone — the sample is the thing that was actually chosen.
    expect(prompts[1]).toContain("Sample 2 for outline");
    expect(prompts[1]).toContain("Option 2 for outline");
    // And the row now says which topic it built and what was answered.
    expect(plans[0]?.topicId).toBe(topics[0]?.id);
    expect(plans[0]?.answers).toEqual([{ kind: MapQuestionKind.Outline, optionIndex: 2 }]);
  });

  it("refuses a plan belonging to someone else, before creating anything", async () => {
    const { db, created: topics } = planDb([
      {
        id: "p-other",
        userId: "u2",
        topicId: null,
        questions: JSON.parse(QUESTIONS).questions,
        answers: [],
        createdAt: new Date(),
      },
    ]);
    const { provider } = recorder(MAP);
    const response = await post(db, provider, "/api/topics", {
      title: "Kubernetes",
      planId: "p-other",
      answers: [{ kind: MapQuestionKind.Outline, optionIndex: 0 }],
    });

    expect(response.status).toBe(404);
    // No half-made topic left behind, and no model call spent on it.
    expect(topics).toEqual([]);
  });

  it("refuses answers that arrive without the questions they answer", async () => {
    // "The second one" of a set of four this request never names. Building a map
    // that silently dropped every pick would be worse than saying so.
    const { db, created: topics } = planDb([]);
    const { provider } = recorder(MAP);
    const response = await post(db, provider, "/api/topics", {
      title: "Kubernetes",
      answers: [{ kind: MapQuestionKind.Outline, optionIndex: 1 }],
    });

    expect(response.status).toBe(409);
    expect(topics).toEqual([]);
  });

  it("stops a thirty-first set of questions, but never a build", async () => {
    // The plan cap exists to stop someone generating questions all day. If it
    // also gated the build, a learner who had just answered seven questions
    // would be told they could not have the map they answered them for.
    const spent: PlanRow[] = Array.from({ length: 30 }, (_, index) => ({
      id: `p${index}`,
      userId: "u1",
      topicId: null,
      questions: JSON.parse(QUESTIONS).questions,
      answers: [],
      createdAt: new Date(),
    }));
    const { db } = planDb(spent);
    const { provider } = recorder(QUESTIONS, MAP);

    const asked = await post(db, provider, "/api/topics/questions", { title: "Kubernetes" });
    expect(asked.status).toBe(409);

    const built = await post(db, provider, "/api/topics", {
      title: "Kubernetes",
      planId: "p0",
      answers: [{ kind: MapQuestionKind.Outline, optionIndex: 1 }],
    });
    expect(built.status).toBe(201);
  });

  it("builds a map with no choices at all, so a skipped question changes nothing else", async () => {
    const { db } = planDb([]);
    const { provider, prompts } = recorder(MAP);
    const response = await post(db, provider, "/api/topics", { title: "Kubernetes" });

    expect(response.status).toBe(201);
    expect(prompts[0]).not.toContain("They chose:");
  });

  it("retries a failed build from the answers the failed build used", async () => {
    // The screen after a failure says nothing was lost. The plan was linked
    // before the map was generated, so the answers outlived the failure — asking
    // the seven questions again there would be asking for work already done.
    const { db } = planDb([
      {
        id: "p1",
        userId: "u1",
        topicId: "t1",
        questions: JSON.parse(QUESTIONS).questions,
        answers: [{ kind: MapQuestionKind.Code, optionIndex: 3 }],
        createdAt: new Date(),
      },
    ]);
    const { provider, prompts } = recorder(MAP);
    const response = await post(db, provider, "/api/topics/kubernetes/regenerate", {
      instructions: "",
      answers: [],
    });

    expect(response.status).toBe(200);
    expect(prompts[0]).toContain("Sample 3 for code");
  });
});
