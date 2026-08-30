import { LlmProviderId } from "@learnloop/schemas";
import { env } from "../env";
import { GenerationError } from "../errors";
import { createGeminiProvider } from "./gemini";
import type { LlmProvider } from "./types";

/**
 * Adding a provider is a new file next to gemini.ts plus one branch here.
 * Nothing else in the codebase names a provider, and the column that records
 * the choice is a plain string, so there is no migration either.
 */
export function createProvider(): LlmProvider {
  switch (env.LLM_PROVIDER) {
    case LlmProviderId.Gemini: {
      if (env.GEMINI_API_KEY === undefined) {
        throw new GenerationError("LLM_PROVIDER is gemini but GEMINI_API_KEY is not set");
      }
      return createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.LLM_MODEL });
    }
    case LlmProviderId.OpenAi:
    case LlmProviderId.Anthropic:
      throw new GenerationError(
        `LLM_PROVIDER=${env.LLM_PROVIDER} is not implemented yet — add it in src/llm/`,
      );
  }
}
