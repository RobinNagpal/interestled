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

/** What a provider needs to answer one structured request. */
export const LlmModelConfig = z.object({
  provider: LlmProviderIdSchema,
  model: z.string().min(1),
  /** Low by default: these prompts want consistency, not invention. */
  temperature: z.number().min(0).max(2).default(0.3),
  maxOutputTokens: z.number().int().positive().default(4096),
});

export type LlmModelConfigT = z.infer<typeof LlmModelConfig>;
