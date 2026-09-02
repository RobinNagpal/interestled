import { Hono } from "hono";
import { cors } from "hono/cors";
import { Prisma } from "@prisma/client";
import type { TextTask } from "@interestled/schemas";
import { z } from "zod";
import { authRouter, requireAuth, sessionRouter } from "./auth";
import type { AuthEnv } from "./auth";
import type { Db } from "./db";
import { ConflictError, GenerationError, NotFoundError } from "./errors";
import { learningRouter } from "./learning";
import { createProvider, createSpeechProvider } from "./llm";
import type { LlmProvider, SpeechProvider } from "./llm";
import { profileRouter } from "./profile";
import { reviewRouter } from "./review";
import { sessionsRouter } from "./sessions";
import { createObjectStore } from "./storage";
import type { ObjectStore } from "./storage";
import { topicsRouter } from "./topics";

/** P2002 reports the columns that collided; naming them beats guessing. */
const UniqueViolation = z.object({ target: z.array(z.string()) });

function uniqueMessage(error: Prisma.PrismaClientKnownRequestError): string {
  const parsed = UniqueViolation.safeParse(error.meta);
  return parsed.success
    ? `That ${parsed.data.target.join(" and ")} is already taken`
    : "That value is already taken";
}

/**
 * Same-origin in production — CloudFront serves the app and /api/* from one
 * domain — so CORS exists only for local development, where the Expo dev server
 * is on a different port. Defaulting to "*" would let any site on the internet
 * drive this API, which matters more than usual when every generation call
 * costs money.
 */
function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS;
  if (configured !== undefined && configured.trim() !== "") {
    return configured.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
  }
  return ["http://localhost:7070", "http://localhost:8081"];
}

export interface AppOptions {
  /**
   * Built lazily and once per task: a missing API key must fail the request that
   * needed the model, not stop the server from serving anything at all. The task
   * is what picks the model, so a map and a card can be answered by two.
   */
  provider?: (task: TextTask) => LlmProvider;
  /**
   * The one that reads a card out, and the bucket the recording goes in. Both
   * lazy for the same reason and one more: neither is configured on a local
   * checkout, and a deployment with no AUDIO_BUCKET is one with the play button
   * off rather than one that cannot start.
   */
  speech?: () => SpeechProvider;
  objects?: () => ObjectStore;
}

/** Built on the first call that needs it, and kept for the rest of the process. */
function once<T>(build: () => T): () => T {
  let value: T | null = null;
  return () => (value ??= build());
}

export function createApp(db: Db, options: AppOptions = {}): Hono {
  const app = new Hono();
  const cached = new Map<TextTask, LlmProvider>();
  const provider =
    options.provider ??
    ((task: TextTask): LlmProvider => {
      const existing = cached.get(task);
      if (existing !== undefined) {
        return existing;
      }
      const built = createProvider(task);
      cached.set(task, built);
      return built;
    });
  const speech = options.speech ?? once(createSpeechProvider);
  const objects = options.objects ?? once(createObjectStore);

  const origins = allowedOrigins();
  app.use("*", cors({ origin: (origin) => (origins.includes(origin) ? origin : null) }));
  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/api/auth", authRouter(db));

  const authed = new Hono<AuthEnv>();
  authed.use("*", requireAuth(db));
  authed.route("/auth/session", sessionRouter(db));
  authed.route("/profile", profileRouter(db));
  authed.route("/topics", topicsRouter(db, provider));
  authed.route("/nodes", learningRouter(db, provider, speech, objects));
  authed.route("/review", reviewRouter(db));
  authed.route("/sessions", sessionsRouter(db));
  app.route("/api", authed);

  app.onError((error, c) => {
    if (error instanceof ConflictError) {
      return c.json({ error: error.message }, 409);
    }
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    // 502: the model is an upstream dependency, and the message is written to be
    // shown to the learner rather than swallowed into a generic failure.
    if (error instanceof GenerationError) {
      return c.json({ error: error.message }, 502);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return c.json({ error: uniqueMessage(error) }, 409);
      }
      if (error.code === "P2003") {
        return c.json({ error: "That row points at something that does not exist" }, 400);
      }
      if (error.code === "P2025") {
        return c.json({ error: "Row not found" }, 404);
      }
    }
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
