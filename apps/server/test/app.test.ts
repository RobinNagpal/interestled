import { describe, expect, it, vi } from "vitest";
import {
  CardAngle,
  ContentFormat,
  EnglishLevel,
  DEFAULT_AVERAGE_READ_TIME,
  LearningStyle,
  LlmProviderId,
  LlmTask,
  MAP_QUESTION_KINDS,
  MapPlanView,
  MapQuestionKind,
  NARRATION_VOICE,
  NodeStatus,
  ParagraphLength,
  TechnicalDetail,
  ReadTime,
  TopicArchetype,
  TopicStatus,
  cardVariant,
  narrationKey,
} from "@interestled/schemas";
import { createApp } from "../src/app";
import type { Db } from "../src/db";
import { GenerationError } from "../src/errors";
import type { SpeechProvider } from "../src/llm/speech";
import type { ObjectStore } from "../src/storage";
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
      // Registration allocates a slug, which means reading the ones already
      // handed out that could collide with it.
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: { data: { slug: string } }) => ({
        id: "u1",
        email: "a@b.com",
        // Echoed back rather than fixed, so a test can assert what the folder
        // this account's recordings go in was actually named.
        slug: data.slug,
        // The column's own default, which the real row always carries: the
        // register response says where this learner's cards will start.
        defaultDepth: 2,
        createdAt: new Date(),
      })),
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
    // Deliberately none of the schema defaults, so a test that means to check
    // "the topic's own settings were kept" cannot pass by taking the defaults.
    mainHeadings: 7,
    subHeadings: 3,
    minutesPerDay: 45,
    days: 30,
    depth: 3,
    mapInstructions: "",
    paragraphLength: "medium",
    level: "",
    englishLevel: EnglishLevel.Medium,
    technicalDetail: TechnicalDetail.Medium,
    format: ContentFormat.Prose,
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
    });

    expect(response.status).toBe(200);
    expect(updates).toEqual([
      expect.objectContaining({ summary: "Run and debug a small cluster" }),
    ]);
    // No regeneration, and above all no nodes deleted.
    expect(deletedNodes).toEqual([]);
  });

  it("keeps the cached cards when the writing settings change", async () => {
    // They used to be dropped here, and the next open of every node was then
    // a model call and a thirty-second wait. Now each node answers with the
    // card it has and says the settings moved; writing it again is the
    // reader's press to make.
    const { db, updates, deletedCards } = settingsDb();
    const response = await send(db, "/api/topics/kubernetes/content-settings", {
      englishLevel: EnglishLevel.Advanced,
      technicalDetail: TechnicalDetail.High,
      format: ContentFormat.Prose,
      contentInstructions: "No YAML in the examples",
      averageReadTime: ReadTime.Ten,
    });

    expect(response.status).toBe(200);
    expect(updates).toEqual([
      {
        englishLevel: EnglishLevel.Advanced,
        technicalDetail: TechnicalDetail.High,
        format: ContentFormat.Prose,
        // Defaulted rather than sent: the screen always holds every setting, so
        // a save that omitted one would be a screen that had lost it.
        paragraphLength: ParagraphLength.Medium,
        contentInstructions: "No YAML in the examples",
        averageReadTime: ReadTime.Ten,
      },
    ]);
    expect(deletedCards).toEqual([]);
  });

  it("moves the map's own minutes when the read time changes", async () => {
    // Half-applying the setting is what made "10 minutes" come back as three:
    // the next card is written to ten while every row still says three, and the
    // node's own estimate then caps the card back down to it.
    const { db, minuteWrites } = settingsDb();
    const response = await send(db, "/api/topics/kubernetes/content-settings", {
      englishLevel: EnglishLevel.Medium,
      technicalDetail: TechnicalDetail.Medium,
      format: ContentFormat.Prose,
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
      englishLevel: EnglishLevel.Advanced,
      technicalDetail: TechnicalDetail.High,
      format: ContentFormat.Prose,
      contentInstructions: "",
      averageReadTime: DEFAULT_AVERAGE_READ_TIME,
    });
    expect(minuteWrites).toEqual([]);
  });

  it("writes nothing, and keeps the cards, when the settings come back unchanged", async () => {
    const { db, updates, deletedCards } = settingsDb();
    const response = await send(db, "/api/topics/kubernetes/content-settings", {
      englishLevel: EnglishLevel.Medium,
      technicalDetail: TechnicalDetail.Medium,
      format: ContentFormat.Prose,
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
      englishLevel: EnglishLevel.Medium,
      technicalDetail: TechnicalDetail.Medium,
      format: ContentFormat.Prose,
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
      cardInstructions: "",
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
    mechanism: [{ heading: "What schedules a pod", body: "The scheduler places pods." }],
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
        // The newest card this node has, at any settings: what a plain open
        // is answered with when nothing is cached at the settings asked for.
        findFirst: vi.fn(async () => null),
        upsert: vi.fn(async () => ({ id: "c1" })),
        // What the rewrite budget counts: cards written in the last hour.
        count: vi.fn(async () => 0),
      },
      cardNarration: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(async ({ create }: { create: object }) => ({ ...create })),
        // A rewrite drops the recording with the text it was of.
        deleteMany: vi.fn(async () => ({ count: 0 })),
        // What the narration budget counts: recordings made in the last hour.
        count: vi.fn(async () => 0),
      },
      cardQuestion: {
        findMany: vi.fn(async () => []),
        // What the question budget counts: questions asked in the last hour.
        count: vi.fn(async () => 0),
        create: vi.fn(async ({ data }: { data: object }) => ({ ...data, createdAt: new Date() })),
      },
    };
    return { db: db as unknown as Db, statuses };
  }

  /** The settings a plain open of a three-minute node writes to, at depth 2. */
  const plain = {
    depth: 2,
    minutes: 3,
    englishLevel: EnglishLevel.Medium,
    technicalDetail: TechnicalDetail.Medium,
    format: ContentFormat.Prose,
    paragraphLength: ParagraphLength.Medium,
    angle: CardAngle.Base,
    instructions: "",
  };

  /** A cached row, as the card route reads it. */
  function cardRow(settings: typeof plain, instructions = settings.instructions) {
    return {
      depth: settings.depth,
      variant: cardVariant(settings),
      instructions,
      content: JSON.parse(CARD),
      createdAt: new Date(),
    };
  }

  /** Records what actually reached the model, and which model was asked for. */
  function recording(reply = CARD): {
    provider: (task: LlmTask) => LlmProvider;
    prompts: string[];
    tasks: LlmTask[];
  } {
    const prompts: string[] = [];
    const tasks: LlmTask[] = [];
    return {
      prompts,
      tasks,
      provider: (task: LlmTask) => {
        tasks.push(task);
        return {
          id: LlmProviderId.Gemini,
          model: "test",
          complete: async (request) => {
            prompts.push(request.prompt);
            return reply;
          },
        };
      },
    };
  }

  it("sends the whole map, with this node marked, and marks the node seen", async () => {
    const { db, statuses } = cardDb(mapRows(), "n2");
    const { provider: recorder, prompts, tasks } = recording();
    const response = await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      content: { claim: "A pod is the unit of scheduling." },
      node: { status: NodeStatus.Seen },
      // What the card was actually written to, so the controls can say so.
      settings: {
        depth: 2,
        minutes: 3,
        englishLevel: EnglishLevel.Medium,
        technicalDetail: TechnicalDetail.Medium,
        format: ContentFormat.Prose,
        angle: CardAngle.Base,
      },
    });
    // A card is written inside a map that already exists, many times per map and
    // cheap to write again, so it goes to the fast model rather than the one the
    // map was built on.
    expect(tasks).toEqual([LlmTask.Content]);
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
      `/api/nodes/n2/card?depth=5&minutes=10&englishLevel=${EnglishLevel.Simple}` +
        `&technicalDetail=${TechnicalDetail.High}&format=${ContentFormat.ReferenceNotes}` +
        `&angle=${CardAngle.WhereThisBreaks}`,
      { headers: { Authorization: "Bearer good" } },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      settings: {
        depth: 5,
        minutes: 10,
        englishLevel: EnglishLevel.Simple,
        technicalDetail: TechnicalDetail.High,
        format: ContentFormat.ReferenceNotes,
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
        paragraphLength: ParagraphLength.Medium,
        englishLevel: EnglishLevel.Simple,
        technicalDetail: TechnicalDetail.High,
        format: ContentFormat.ReferenceNotes,
        angle: CardAngle.WhereThisBreaks,
        instructions: "",
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
    cached.conceptCard.findUnique = vi.fn(async () => cardRow(plain));
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

  it("writes the card again on a rewrite, and replaces the row it read past", async () => {
    // The one control that changes nothing about the card and asks for it
    // anyway. Serving it from the cache would make it the only button here that
    // provably does nothing, since the cached row is exactly what it is asking
    // to go around.
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as {
      conceptCard: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
    };
    stub.conceptCard.findUnique = vi.fn(async () => cardRow(plain));
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request(
      "/api/nodes/n2/card?rewrite=1",
      { headers: { Authorization: "Bearer good" } },
    );

    expect(response.status).toBe(200);
    expect(prompts).toHaveLength(1);
    expect(stub.conceptCard.findUnique).not.toHaveBeenCalled();
    // And the new card replaces the old one rather than losing to it: an upsert
    // that no-ops on conflict would generate, charge for it, and then answer
    // with the row it was asked to go around on the next open.
    const written = stub.conceptCard.upsert.mock.calls[0]?.[0] as
      | { update: { content?: unknown; createdAt?: Date } }
      | undefined;
    expect(written?.update.content).toMatchObject({ claim: "A pod is the unit of scheduling." });
    expect(written?.update.createdAt).toBeInstanceOf(Date);
  });

  it("drops the recording of a card it has just replaced the text of", async () => {
    // A rewrite replaces the card's text in place, so a recording left behind
    // is minutes of audio of words that exist nowhere. Nothing is made in its
    // place: pressing Regenerate is not asking to be read to.
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as {
      conceptCard: { findUnique: ReturnType<typeof vi.fn> };
      cardNarration: { deleteMany: ReturnType<typeof vi.fn> };
    };
    stub.conceptCard.findUnique = vi.fn(async () => cardRow(plain));
    const { provider: recorder } = recording();
    await createApp(db, { provider: recorder }).request("/api/nodes/n2/card?rewrite=1", {
      headers: { Authorization: "Bearer good" },
    });

    expect(stub.cardNarration.deleteMany).toHaveBeenCalledWith({ where: { cardId: "c1" } });
  });

  it("keeps the recording when a card is merely read rather than rewritten", async () => {
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as { cardNarration: { deleteMany: ReturnType<typeof vi.fn> } };
    const { provider: recorder } = recording();
    await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });

    expect(stub.cardNarration.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses a rewrite once the hour's card writing has hit its ceiling", async () => {
    // Every other generating call either creates nodes or is answered from the
    // cache the second time. This one costs a model call per press, so without
    // a ceiling the deployment's bill has none.
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as { conceptCard: { count: ReturnType<typeof vi.fn> } };
    stub.conceptCard.count = vi.fn(async () => 60);
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request(
      "/api/nodes/n2/card?rewrite=1",
      { headers: { Authorization: "Bearer good" } },
    );

    expect(response.status).toBe(409);
    expect(prompts).toEqual([]);
  });

  it("lets an ordinary read through at that same count, since only a rewrite is checked", async () => {
    // Reading is bounded by how many nodes there are, so refusing it would only
    // ever mean refusing to show the next node.
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as { conceptCard: { count: ReturnType<typeof vi.fn> } };
    stub.conceptCard.count = vi.fn(async () => 60);
    const { provider: recorder } = recording();
    const response = await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });
    expect(response.status).toBe(200);
  });

  it("answers a plain open with the card the node has when the settings have moved", async () => {
    // The topic's settings changed after this card was written, so nothing is
    // cached at the settings a plain open now asks for. Writing one on the spot
    // is what used to happen, on every node, whether or not the reader wanted
    // this card different. The card that exists is answered instead, with what
    // it was written to and what the node now asks for, and the panel says so.
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as { conceptCard: { findFirst: ReturnType<typeof vi.fn> } };
    const before = { ...plain, englishLevel: EnglishLevel.Simple, depth: 4 };
    stub.conceptCard.findFirst = vi.fn(async () => cardRow(before));
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });

    expect(response.status).toBe(200);
    expect(prompts).toEqual([]);
    expect(await response.json()).toMatchObject({
      settings: { englishLevel: EnglishLevel.Simple, depth: 4 },
      defaults: { englishLevel: EnglishLevel.Medium, depth: 2 },
    });
    // The newest card, whatever it was written to: "the one you last read".
    expect(stub.conceptCard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("writes the card a moved chip asks for, even when the node has one already", async () => {
    // A chip moved somewhere new is a request for the card that lives there.
    // Answering it with the old card would make the button do nothing.
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as { conceptCard: { findFirst: ReturnType<typeof vi.fn> } };
    stub.conceptCard.findFirst = vi.fn(async () => cardRow(plain));
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request(
      `/api/nodes/n2/card?angle=${CardAngle.WhereThisBreaks}`,
      { headers: { Authorization: "Bearer good" } },
    );

    expect(response.status).toBe(200);
    expect(prompts).toHaveLength(1);
    expect(stub.conceptCard.findFirst).not.toHaveBeenCalled();
  });

  it("does not answer with a card from an earlier prompt revision", async () => {
    // Bumping the revision is how every cached card is retired without a
    // migration. A row that cannot be named is one that is never served.
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as { conceptCard: { findFirst: ReturnType<typeof vi.fn> } };
    stub.conceptCard.findFirst = vi.fn(async () => ({
      ...cardRow(plain),
      variant: cardRow(plain).variant.replace(/^r\d+/, "r1"),
    }));
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });

    expect(response.status).toBe(200);
    expect(prompts).toHaveLength(1);
  });

  it("writes the node's own instructions into the card, and stores them on it", async () => {
    const rows = mapRows().map((row) =>
      row.id === "n2" ? { ...row, cardInstructions: "Compare it with how Postgres does it" } : row,
    );
    const { db } = cardDb(rows, "n2");
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });

    expect(response.status).toBe(200);
    expect(prompts[0]).toContain("Compare it with how Postgres does it");
    expect(await response.json()).toMatchObject({
      settings: { instructions: "Compare it with how Postgres does it" },
      defaults: { instructions: "Compare it with how Postgres does it" },
    });
    const written = (db as unknown as { conceptCard: { upsert: ReturnType<typeof vi.fn> } })
      .conceptCard.upsert.mock.calls[0]?.[0] as { create: { instructions: string } } | undefined;
    expect(written?.create.instructions).toBe("Compare it with how Postgres does it");
  });

  it("answers a cached card with the instructions it was written to, not the node's", async () => {
    // The instructions are not in the key, so the row at it may have been
    // written before they changed. It is still the card the reader has: the
    // panel says the settings moved, and nothing is written until asked.
    const rows = mapRows().map((row) =>
      row.id === "n2" ? { ...row, cardInstructions: "Use an example from banking" } : row,
    );
    const { db } = cardDb(rows, "n2");
    const stub = db as unknown as { conceptCard: { findUnique: ReturnType<typeof vi.fn> } };
    stub.conceptCard.findUnique = vi.fn(async () => cardRow(plain, ""));
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request("/api/nodes/n2/card", {
      headers: { Authorization: "Bearer good" },
    });

    expect(response.status).toBe(200);
    expect(prompts).toEqual([]);
    expect(await response.json()).toMatchObject({
      settings: { instructions: "" },
      defaults: { instructions: "Use an example from banking" },
    });
  });

  it("saves a card's instructions on the node without writing anything", async () => {
    const { db } = cardDb(mapRows(), "n2");
    const stub = db as unknown as { learningNode: { update: ReturnType<typeof vi.fn> } };
    const { provider: recorder, prompts } = recording();
    const response = await createApp(db, { provider: recorder }).request(
      "/api/nodes/n2/card-instructions",
      {
        method: "PUT",
        headers: { "content-type": "application/json", Authorization: "Bearer good" },
        body: JSON.stringify({ instructions: "  Use an example from banking  " }),
      },
    );

    expect(response.status).toBe(200);
    expect(prompts).toEqual([]);
    expect(stub.learningNode.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cardInstructions: "Use an example from banking" } }),
    );
    expect(await response.json()).toMatchObject({
      id: "n2",
      cardInstructions: "Use an example from banking",
    });
  });

  it("reads \"rewrite=false\" as not a rewrite, rather than as a rewrite", async () => {
    // Boolean("false") is true, which is the whole reason this is a literal:
    // a client saying it does not want one would otherwise be charged for one
    // and lose the card its reader was looking at.
    const { db } = cardDb(mapRows(), "n2");
    const { provider: recorder } = recording();
    const response = await createApp(db, { provider: recorder }).request(
      "/api/nodes/n2/card?rewrite=false",
      { headers: { Authorization: "Bearer good" } },
    );
    expect(response.status).toBe(400);
  });
});

/**
 * A question asked on a card. It is answered against the card the learner is
 * reading — never a fresh one written for the occasion — and kept with the
 * node; and it is a model call a learner can repeat without bound, so it has a
 * ceiling of its own.
 */
describe("card questions", () => {
  const ANSWER = JSON.stringify({ answer: "Because the actual state keeps changing under it." });

  function questionDb(): { db: Db; created: object[] } {
    const created: object[] = [];
    const node = {
      id: "n2",
      topicId: "t1",
      parentId: "g1",
      path: "pods/restarts",
      title: "Restarts and probes",
      claim: "c",
      minutes: 3,
      archetype: TopicArchetype.Tool,
      orderIndex: 1,
      status: NodeStatus.Seen,
      capability: "do it",
      cardInstructions: "",
      createdAt: new Date(),
    };
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
      learningNode: {
        findFirst: vi.fn(async () => ({ ...node, prerequisites: [], topic: topicRow() })),
        count: vi.fn(async () => 0),
        findMany: vi.fn(async () => [{ ...node, prerequisites: [] }]),
      },
      conceptCard: {
        // The card the learner is reading.
        findUnique: vi.fn(async () => ({
          depth: 2,
          variant: "base",
          instructions: "",
          content: {
            claim: "A pod is the unit of scheduling.",
            mechanism: [{ heading: "What schedules a pod", body: "The scheduler places pods." }],
            jargon: [],
          },
        })),
        findFirst: vi.fn(async () => null),
      },
      cardQuestion: {
        count: vi.fn(async () => 0),
        findMany: vi.fn(async () => [
          {
            id: "q0",
            nodeId: "n2",
            question: "Why forever?",
            answer: "Because it drifts.",
            createdAt: new Date(),
          },
        ]),
        create: vi.fn(async ({ data }: { data: object }) => {
          created.push(data);
          return { ...data, createdAt: new Date() };
        }),
      },
    };
    return { db: db as unknown as Db, created };
  }

  const ask = (db: Db, provider: (task: LlmTask) => LlmProvider, question: string) =>
    createApp(db, { provider }).request("/api/nodes/n2/questions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer good" },
      body: JSON.stringify({ question }),
    });

  function recording(reply: string): { provider: (task: LlmTask) => LlmProvider; prompts: string[] } {
    const prompts: string[] = [];
    return {
      prompts,
      provider: () => ({
        id: LlmProviderId.Gemini,
        model: "test",
        complete: async (request) => {
          prompts.push(request.prompt);
          return reply;
        },
      }),
    };
  }

  it("answers against the card the learner has, and keeps the question", async () => {
    const { db, created } = questionDb();
    const { provider, prompts } = recording(ANSWER);
    const response = await ask(db, provider, "What happens if two controllers disagree?");

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      nodeId: "n2",
      question: "What happens if two controllers disagree?",
      answer: "Because the actual state keeps changing under it.",
    });
    // One model call: the answer. The card was read, not written.
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain("What happens if two controllers disagree?");
    expect(prompts[0]).toContain("A pod is the unit of scheduling.");
    // The earlier question on this card goes in, so a follow-up follows.
    expect(prompts[0]).toContain("Q: Why forever?");
    // One paragraph, the length the card's paragraphs are.
    expect(prompts[0]).toContain("4-5 sentences");
    expect(created).toEqual([
      expect.objectContaining({
        nodeId: "n2",
        question: "What happens if two controllers disagree?",
        answer: "Because the actual state keeps changing under it.",
      }),
    ]);
  });

  it("lists what was asked, oldest first", async () => {
    const { db } = questionDb();
    const { provider } = recording(ANSWER);
    const response = await createApp(db, { provider }).request("/api/nodes/n2/questions", {
      headers: { Authorization: "Bearer good" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([{ id: "q0", question: "Why forever?" }]);
    const stub = db as unknown as { cardQuestion: { findMany: ReturnType<typeof vi.fn> } };
    expect(stub.cardQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "asc" } }),
    );
  });

  it("refuses an empty question before it costs anything", async () => {
    const { db } = questionDb();
    const { provider, prompts } = recording(ANSWER);
    expect((await ask(db, provider, "   ")).status).toBe(400);
    expect(prompts).toEqual([]);
  });

  it("stops the sixty-first question in an hour", async () => {
    const { db } = questionDb();
    const stub = db as unknown as { cardQuestion: { count: ReturnType<typeof vi.fn> } };
    stub.cardQuestion.count = vi.fn(async () => 60);
    const { provider, prompts } = recording(ANSWER);
    expect((await ask(db, provider, "Why?")).status).toBe(409);
    expect(prompts).toEqual([]);
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

  function planDb(plans: PlanRow[]): {
    db: Db;
    created: Record<string, unknown>[];
    plans: PlanRow[];
    updates: Record<string, unknown>[];
  } {
    const created: Record<string, unknown>[] = [];
    const updates: Record<string, unknown>[] = [];
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
        update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data);
          return { ...topicRow(), ...data };
        }),
      },
      learningNode: {
        count: vi.fn(async () => 0),
        findMany: vi.fn(async () => []),
        createMany: vi.fn(async () => ({ count: 1 })),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      nodePrerequisite: { createMany: vi.fn(async () => ({ count: 0 })) },
    };
    return { db: db as unknown as Db, created, plans, updates };
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

  /** Replays the canned replies in order, keeping every prompt and every task. */
  function recorder(...replies: string[]): {
    provider: (task: LlmTask) => LlmProvider;
    prompts: string[];
    tasks: LlmTask[];
  } {
    const prompts: string[] = [];
    const tasks: LlmTask[] = [];
    return {
      prompts,
      tasks,
      provider: (task: LlmTask) => {
        tasks.push(task);
        return {
          id: LlmProviderId.Gemini,
          model: "test",
          complete: async (request) => {
            prompts.push(request.prompt);
            return replies.shift() ?? "";
          },
        };
      },
    };
  }

  const post = async (
    db: Db,
    provider: (task: LlmTask) => LlmProvider,
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
    const { provider, prompts, tasks } = recorder(QUESTIONS, MAP);
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
      answers: [{ kind: MapQuestionKind.Outline, optionIndexes: [2] }],
    });

    expect(built.status).toBe(201);
    // Both calls are map-shaped, so both go to the reasoning model. A map is
    // generated once and everything hangs off it; writing it on the cheap model
    // to save a few cents is the wrong end to save at.
    expect(tasks).toEqual([LlmTask.Map, LlmTask.Map]);
    // The second prompt is the map. What reaches it is the sample, not the label
    // alone — the sample is the thing that was actually chosen.
    expect(prompts[1]).toContain("Sample 2 for outline");
    expect(prompts[1]).toContain("Option 2 for outline");
    // And what they turned down, which is the other half of the answer.
    expect(prompts[1]).toContain("They passed over:");
    expect(prompts[1]).toContain("Option 0 for outline");
    // And the row now says which topic it built and what was answered.
    expect(plans[0]?.topicId).toBe(topics[0]?.id);
    expect(plans[0]?.answers).toEqual([{ kind: MapQuestionKind.Outline, optionIndexes: [2] }]);
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
      answers: [{ kind: MapQuestionKind.Outline, optionIndexes: [0] }],
    });

    expect(response.status).toBe(404);
    // No half-made topic left behind, and no model call spent on it.
    expect(topics).toEqual([]);
  });

  it("carries every option of a multi-pick answer into the map prompt", async () => {
    // The four options are not exclusive: two cuts of a subject can both be
    // wanted and blended. Sending only the first would build the map from half
    // of what the learner meant.
    const { db, plans } = planDb([]);
    const { provider, prompts } = recorder(QUESTIONS, MAP);
    const app = createApp(db, { provider });
    const asked = await app.request("/api/topics/questions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer good" },
      body: JSON.stringify({ title: "Kubernetes" }),
    });
    const { planId } = MapPlanView.parse(await asked.json());

    const answers = [{ kind: MapQuestionKind.Outline, optionIndexes: [0, 3] }];
    const built = await post(db, provider, "/api/topics", {
      title: "Kubernetes",
      planId,
      answers,
    });

    expect(built.status).toBe(201);
    expect(prompts[1]).toContain("Sample 0 for outline");
    expect(prompts[1]).toContain("Sample 3 for outline");
    // The two left are the ones passed over, not the ones picked.
    expect(prompts[1]?.indexOf("Option 0 for outline")).toBeLessThan(
      prompts[1]?.indexOf("They passed over:") ?? 0,
    );
    expect(plans[0]?.answers).toEqual(answers);
  });

  it("refuses an answer that names the same option twice", async () => {
    const { db, created: topics } = planDb([
      {
        id: "p1",
        userId: "u1",
        topicId: null,
        questions: JSON.parse(QUESTIONS).questions,
        answers: [],
        createdAt: new Date(),
      },
    ]);
    const { provider } = recorder(MAP);
    const response = await post(db, provider, "/api/topics", {
      title: "Kubernetes",
      planId: "p1",
      answers: [{ kind: MapQuestionKind.Outline, optionIndexes: [1, 1] }],
    });

    expect(response.status).toBe(400);
    expect(topics).toEqual([]);
  });

  it("keeps the topic's own shape when a rebuild names none", async () => {
    // A client cached from before the shape existed posts none of it. Taking the
    // schema defaults there would silently reset the topic to five headings of
    // four, which is a setting the learner never touched being thrown away.
    const { db, updates } = planDb([]);
    const { provider } = recorder(MAP);
    const response = await post(db, provider, "/api/topics/kubernetes/regenerate", {
      answers: [],
    });

    expect(response.status).toBe(200);
    expect(updates[0]).toMatchObject({ mainHeadings: 7, subHeadings: 3, days: 30 });
  });

  it("refuses answers that arrive without the questions they answer", async () => {
    // "The second one" of a set of four this request never names. Building a map
    // that silently dropped every pick would be worse than saying so.
    const { db, created: topics } = planDb([]);
    const { provider } = recorder(MAP);
    const response = await post(db, provider, "/api/topics", {
      title: "Kubernetes",
      answers: [{ kind: MapQuestionKind.Outline, optionIndexes: [1] }],
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
      answers: [{ kind: MapQuestionKind.Outline, optionIndexes: [1] }],
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
        answers: [{ kind: MapQuestionKind.Known, optionIndexes: [3] }],
        createdAt: new Date(),
      },
    ]);
    const { provider, prompts } = recorder(MAP);
    const response = await post(db, provider, "/api/topics/kubernetes/regenerate", {
      instructions: "",
      answers: [],
    });

    expect(response.status).toBe(200);
    expect(prompts[0]).toContain("Sample 3 for known");
  });
});

/**
 * The card, read out.
 *
 * Two calls to two different models and an object in a bucket, which is the
 * most expensive press in the product — so what these are here to catch is the
 * paths that make it cost twice: a second press paying for the same card again,
 * a rewrite leaving a recording of text nobody can read, and a plain GET
 * writing anything at all.
 */
describe("reading a card out", () => {
  const SCRIPT = "So a pod is the unit of scheduling. Look at the section called What schedules a pod.";
  /** A second of 16-bit mono at the rate the TTS models answer at. */
  const PCM = Buffer.alloc(24000 * 2, 1);

  const cardSettings = {
    depth: 2,
    minutes: 3,
    englishLevel: EnglishLevel.Medium,
    technicalDetail: TechnicalDetail.Medium,
    format: ContentFormat.Prose,
    paragraphLength: ParagraphLength.Medium,
    angle: CardAngle.Base,
    instructions: "",
  };

  const cardContent = {
    claim: "A pod is the unit of scheduling.",
    mechanism: [{ heading: "What schedules a pod", body: "The scheduler places pods." }],
    jargon: [],
  };

  /** The key this learner's recording of that card belongs at. */
  const KEY = narrationKey({
    userSlug: "robin",
    topicSlug: "kubernetes",
    nodePath: "pods/restarts",
    depth: cardSettings.depth,
    variant: cardVariant(cardSettings),
  });

  interface AudioStub {
    db: Db;
    /** Everything written to the bucket, in order. */
    put: { key: string; body: Buffer; contentType: string }[];
    /** Every row the narration table was asked to write. */
    saved: object[];
    /** What was actually sent to the speech model. */
    spoken: { text: string; voice: string }[];
    speech: () => SpeechProvider;
    objects: () => ObjectStore;
  }

  function audioStub(
    options: {
      card?: object | null;
      narration?: object | null;
      /** Recordings made in the last hour, against the ceiling. */
      recent?: number;
      children?: number;
    } = {},
  ): AudioStub {
    const put: { key: string; body: Buffer; contentType: string }[] = [];
    const saved: object[] = [];
    const spoken: { text: string; voice: string }[] = [];
    const card =
      options.card === undefined
        ? {
            id: "c1",
            nodeId: "n2",
            depth: cardSettings.depth,
            variant: cardVariant(cardSettings),
            instructions: "",
            content: cardContent,
            createdAt: new Date(),
          }
        : options.card;
    const db = {
      authSession: {
        findUnique: vi.fn(async () => ({
          token: "good",
          userId: "u1",
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: "u1", defaultDepth: 2 },
        })),
      },
      user: { findUnique: vi.fn(async () => ({ slug: "robin" })) },
      learningNode: {
        findFirst: vi.fn(async () => ({
          id: "n2",
          topicId: "t1",
          parentId: "g1",
          path: "pods/restarts",
          title: "Restarts and probes",
          claim: "c",
          minutes: 3,
          archetype: TopicArchetype.Tool,
          orderIndex: 1,
          status: NodeStatus.Seen,
          capability: "do it",
          cardInstructions: "",
          createdAt: new Date(),
          prerequisites: [],
          topic: topicRow(),
        })),
        count: vi.fn(async () => options.children ?? 0),
      },
      conceptCard: { findFirst: vi.fn(async () => card) },
      cardNarration: {
        findUnique: vi.fn(async () => options.narration ?? null),
        count: vi.fn(async () => options.recent ?? 0),
        upsert: vi.fn(async ({ create }: { create: object }) => {
          saved.push(create);
          return create;
        }),
      },
    };
    return {
      db: db as unknown as Db,
      put,
      saved,
      spoken,
      speech: () => ({
        id: LlmProviderId.Gemini,
        model: "tts",
        speak: async (request) => {
          spoken.push(request);
          return { audio: PCM, mimeType: "audio/L16;codec=pcm;rate=24000" };
        },
      }),
      objects: () => ({
        put: async (key, body, contentType) => {
          put.push({ key, body, contentType });
        },
        signedUrl: async (key, seconds) => `https://bucket.example/${key}?expires=${seconds}`,
      }),
    };
  }

  const audioProvider = (): LlmProvider => ({
    id: LlmProviderId.Gemini,
    model: "test",
    complete: async () => JSON.stringify({ script: SCRIPT }),
  });

  const authed = { Authorization: "Bearer good" };

  it("answers a node with no recording with null, and writes nothing", async () => {
    const stub = audioStub({ narration: null });
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { headers: authed });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ audio: null });
    // A GET must not reach either model or the bucket: the button asks whether
    // there is a recording, and being asked cannot be what makes one.
    expect(stub.spoken).toHaveLength(0);
    expect(stub.put).toHaveLength(0);
    expect(stub.saved).toHaveLength(0);
  });

  it("answers a node with no card at all with null rather than writing one", async () => {
    const stub = audioStub({ card: null });
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { headers: authed });

    expect(await response.json()).toEqual({ audio: null });
  });

  it("writes the script, says it, and puts one playable object in the bucket", async () => {
    const stub = audioStub();
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { method: "POST", headers: authed });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      audio: { url: `https://bucket.example/${KEY}?expires=3600`, seconds: 1, voice: NARRATION_VOICE },
    });

    // The words the model wrote, in the voice the product uses — and nothing
    // else: a speech model handed instructions as well as words reads the
    // instructions out.
    expect(stub.spoken).toEqual([{ text: SCRIPT, voice: NARRATION_VOICE }]);

    // Raw PCM is not something a browser or a phone will play, so what lands in
    // the bucket has a RIFF header on it and says it is a WAV.
    const [object] = stub.put;
    expect(object?.key).toBe(KEY);
    expect(object?.contentType).toBe("audio/wav");
    expect(object?.body.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(object?.body.length).toBe(PCM.length + 44);

    // The script is kept beside the audio: it is the only readable record of
    // what a recording says, and re-saying it must not mean writing it again.
    expect(stub.saved[0]).toMatchObject({
      cardId: "c1",
      script: SCRIPT,
      objectKey: KEY,
      seconds: 1,
      voice: NARRATION_VOICE,
    });
  });

  it("lays the bucket out by the learner, the topic and the path down the map", async () => {
    const stub = audioStub();
    await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { method: "POST", headers: authed });

    expect(stub.put[0]?.key.startsWith("robin/kubernetes/pods/restarts/")).toBe(true);
  });

  it("answers a second press from the bucket rather than paying for it twice", async () => {
    // The one thing that must never regress: a double tap, or coming back to a
    // card an hour later, costs a signature and nothing else.
    const stub = audioStub({
      narration: { objectKey: KEY, seconds: 91, voice: NARRATION_VOICE },
    });
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { method: "POST", headers: authed });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ audio: { seconds: 91 } });
    expect(stub.spoken).toHaveLength(0);
    expect(stub.put).toHaveLength(0);
  });

  it("does not serve a recording made under an earlier narration prompt", async () => {
    // The revision travels in the key, so bumping it makes every stored row
    // miss its own lookup — the same trick CARD_PROMPT_REVISION plays, with no
    // migration and nothing to delete.
    const stub = audioStub({
      narration: { objectKey: "robin/kubernetes/pods/restarts/n0-d2-old.wav", seconds: 91, voice: "Kore" },
    });
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { headers: authed });

    expect(await response.json()).toEqual({ audio: null });
  });

  it("refuses once the hour's recordings have hit the ceiling", async () => {
    const stub = audioStub({ recent: 20 });
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { method: "POST", headers: authed });

    expect(response.status).toBe(409);
    expect(stub.spoken).toHaveLength(0);
  });

  it("refuses a node with no card rather than writing one to read out", async () => {
    const stub = audioStub({ card: null });
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { method: "POST", headers: authed });

    expect(response.status).toBe(409);
    expect(stub.spoken).toHaveLength(0);
  });

  it("refuses a group, which has no card to read out", async () => {
    const stub = audioStub({ children: 4 });
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: stub.objects,
    }).request("/api/nodes/n2/audio", { method: "POST", headers: authed });

    expect(response.status).toBe(409);
  });

  it("says nothing about a deployment with no bucket except what is not set", async () => {
    const stub = audioStub();
    const response = await createApp(stub.db, {
      provider: audioProvider,
      speech: stub.speech,
      objects: () => {
        throw new GenerationError(
          "Reading cards aloud is not set up on this deployment — AUDIO_BUCKET is not set",
        );
      },
    }).request("/api/nodes/n2/audio", { headers: authed });

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("AUDIO_BUCKET") });
  });
});
