import { handle } from "hono/aws-lambda";
import { createApp } from "./app";
import { createDb } from "./db";

/**
 * AWS Lambda entry point (deployed behind a Function URL, see deployment/).
 * Mirrors index.ts. The Prisma client and the LLM provider are both created
 * lazily inside the app, so a cold container that is missing an env var fails
 * the request rather than failing to start.
 */
const db = createDb();

export const handler = handle(createApp(db));
