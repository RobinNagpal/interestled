import { describe, expect, it, vi } from "vitest";
import { LlmProviderId } from "@learnloop/schemas";
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
function stubDb(session: { token: string; userId: string } | null): Db {
  const db = {
    user: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "u1", email: "a@b.com", createdAt: new Date() })),
    },
    authSession: {
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) =>
        session !== null && where.token === session.token
          ? { token: session.token, userId: session.userId, user: { id: session.userId, defaultDepth: 2 } }
          : null,
      ),
      create: vi.fn(async () => ({})),
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
