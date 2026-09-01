import { z } from "zod";

/**
 * Providers the server can be pointed at. Only Gemini is implemented today;
 * adding one is a new file in apps/server/src/llm plus a line in its registry,
 * with no migration because the column is a plain string.
 */
export enum LlmProviderId {
  Gemini = "gemini",
  OpenAi = "openai",
  Anthropic = "anthropic",
}

export const LlmProviderIdSchema = z.nativeEnum(LlmProviderId);

/**
 * What a call is for, which is what decides which model answers it.
 *
 * Two, because there are two jobs with different stakes. A map is generated once
 * and everything else hangs off it — a bad cut of the subject is wrong on every
 * screen afterwards and the learner cannot correct it without rebuilding — so it
 * goes to the reasoning model. Cards, drills, review items and grading are
 * written many times per map, each one small, each one already scoped by the map
 * above it, and each one cheap to rewrite, so they go to the fast one.
 *
 * An enum rather than two provider arguments because the call site should say
 * which job it is doing, and a boolean at ten call sites says nothing.
 */
export enum LlmTask {
  /** The map, the seven choices that shape it, and rebuilding one group of it. */
  Map = "map",
  /** Everything written inside a map: cards, drills, review items, verdicts. */
  Content = "content",
}

export const LlmTaskSchema = z.nativeEnum(LlmTask);

/** What a provider needs to answer one structured request. */
export const LlmModelConfig = z.object({
  provider: LlmProviderIdSchema,
  model: z.string().min(1),
  /** Low by default: these prompts want consistency, not invention. */
  temperature: z.number().min(0).max(2).default(0.3),
  maxOutputTokens: z.number().int().positive().default(4096),
});

export type LlmModelConfigT = z.infer<typeof LlmModelConfig>;
