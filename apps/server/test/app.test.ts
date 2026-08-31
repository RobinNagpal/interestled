import { describe, expect, it, vi } from "vitest";
import { LearningStyle, LlmProviderId } from "@interestled/schemas";
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
