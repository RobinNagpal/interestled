import "dotenv/config";
import { z } from "zod";
import { LlmProviderId, LlmProviderIdSchema, LlmTask } from "@interestled/schemas";

/**
 * An unset repository variable still reaches the box as a line.
 *
 * The deploy workflow writes /etc/interestled-api.env from `vars.X`, and an
 * unset variable interpolates to nothing — so the file gets `LLM_MODEL=` rather
 * than no line at all. Zod fills a default for `undefined` and not for `""`, so
 * without this an unset variable fails `min(1)` and the parse throws on the
 * first request, which takes down registration, login and the map screen alike
 * for what is supposed to be an optional setting.
 */
function unsetWhenEmpty<T extends z.ZodTypeAny>(schema: T): z.ZodEffects<T, T["_output"], unknown> {
  return z.preprocess((value) => (value === "" ? undefined : value), schema);
}

/**
 * Provider keys are all optional here and checked when the provider is actually
 * built, so running with LLM_PROVIDER=gemini does not require an OpenAI key.
 */
export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: unsetWhenEmpty(z.coerce.number().int().positive().default(7071)),
  LLM_PROVIDER: unsetWhenEmpty(LlmProviderIdSchema.default(LlmProviderId.Gemini)),
  /**
   * The model that builds maps: the whole map, the seven choices in front of it,
   * and one group rebuilt. Google retires these — gemini-2.0-flash returned 404
   * "no longer available" in August 2026 — so the default is only a default and
   * LLM_MODEL is set per deployment.
   *
   * gemini-3.1-pro-preview is Gemini 3.1 Pro, which is preview-only: there is no
   * stable gemini-3.1-pro on the Gemini API. It reasons before it answers and
   * cannot be told not to, which is why the map calls carry the output budget
   * they do — thinking is spent from the same allowance as the reply.
   */
  LLM_MODEL: unsetWhenEmpty(z.string().min(1).default("gemini-3.1-pro-preview")),
  /**
   * The model that writes everything inside a map. Separate because the two jobs
   * are priced differently and used at completely different rates: one map per
   * topic against a card, a drill and a verdict per node. Flash is roughly a
   * third of Pro per output token, and a card is a page of prose the learner can
   * already rewrite with the controls under it.
   *
   * Unset falls back to this default rather than to LLM_MODEL, so a deployment
   * that only names the map model still gets the cheap one for content.
   */
  LLM_CONTENT_MODEL: unsetWhenEmpty(z.string().min(1).default("gemini-3.6-flash")),
  GEMINI_API_KEY: unsetWhenEmpty(z.string().min(1).optional()),
  OPENAI_API_KEY: unsetWhenEmpty(z.string().min(1).optional()),
  ANTHROPIC_API_KEY: unsetWhenEmpty(z.string().min(1).optional()),
});

export type EnvT = z.infer<typeof EnvSchema>;

/** The model each job runs on. One place, so a new task cannot silently pick one. */
export function modelFor(env: EnvT, task: LlmTask): string {
  return task === LlmTask.Map ? env.LLM_MODEL : env.LLM_CONTENT_MODEL;
}

let parsed: EnvT | null = null;

/**
 * Parsed on first use rather than at import. Parsing at import time makes the
 * environment a load-order dependency: importing anything that transitively
 * reaches this file — createApp does, through the LLM registry — would throw
 * before a single line ran. Lazily, a missing variable fails the request that
 * needed it, which is what the Lambda entry point promises.
 */
export function getEnv(): EnvT {
  return (parsed ??= EnvSchema.parse(process.env));
}
