import "dotenv/config";
import { z } from "zod";
import { LlmProviderId, LlmProviderIdSchema } from "@learnloop/schemas";

/**
 * Provider keys are all optional here and checked when the provider is actually
 * built, so running with LLM_PROVIDER=gemini does not require an OpenAI key.
 */
const Env = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().int().positive().default(7071),
  LLM_PROVIDER: LlmProviderIdSchema.default(LlmProviderId.Gemini),
  LLM_MODEL: z.string().min(1).default("gemini-2.0-flash"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

export type EnvT = z.infer<typeof Env>;

let parsed: EnvT | null = null;

/**
 * Parsed on first use rather than at import. Parsing at import time makes the
 * environment a load-order dependency: importing anything that transitively
 * reaches this file — createApp does, through the LLM registry — would throw
 * before a single line ran. Lazily, a missing variable fails the request that
 * needed it, which is what the Lambda entry point promises.
 */
export function getEnv(): EnvT {
  return (parsed ??= Env.parse(process.env));
}
