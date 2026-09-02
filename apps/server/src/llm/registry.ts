import { LlmProviderId, LlmTask } from "@interestled/schemas";
import type { TextTask } from "@interestled/schemas";
import { getEnv, modelFor } from "../env";
import { GenerationError } from "../errors";
import { createGeminiProvider, createGeminiSpeech } from "./gemini";
import type { SpeechProvider } from "./speech";
import type { LlmProvider } from "./types";

/**
 * The provider key, checked once so both factories below fail the same way.
 * A missing key is a request that could not be answered rather than a server
 * that will not start, which is why nothing here runs at import time.
 */
function geminiKey(): string {
  const key = getEnv().GEMINI_API_KEY;
  if (key === undefined) {
    throw new GenerationError("LLM_PROVIDER is gemini but GEMINI_API_KEY is not set");
  }
  return key;
}

/**
 * Adding a provider is a new file next to gemini.ts plus one branch here.
 * Nothing else in the codebase names a provider, and the column that records
 * the choice is a plain string, so there is no migration either.
 *
 * The task decides the model, not the provider: both jobs talk to the same
 * service with the same key, and one of them is worth three times as much per
 * token as the other.
 */
export function createProvider(task: TextTask): LlmProvider {
  const env = getEnv();
  switch (env.LLM_PROVIDER) {
    case LlmProviderId.Gemini:
      return createGeminiProvider({ apiKey: geminiKey(), model: modelFor(env, task) });
    case LlmProviderId.OpenAi:
    case LlmProviderId.Anthropic:
      throw new GenerationError(
        `LLM_PROVIDER=${env.LLM_PROVIDER} is not implemented yet — add it in src/llm/`,
      );
  }
}

/**
 * The provider that reads a card out. Its own factory rather than a third case
 * above, because it answers a different interface: LlmTask.Speech is not a
 * TextTask, so `createProvider(LlmTask.Speech)` does not compile.
 */
export function createSpeechProvider(): SpeechProvider {
  const env = getEnv();
  switch (env.LLM_PROVIDER) {
    case LlmProviderId.Gemini:
      return createGeminiSpeech({ apiKey: geminiKey(), model: modelFor(env, LlmTask.Speech) });
    case LlmProviderId.OpenAi:
    case LlmProviderId.Anthropic:
      throw new GenerationError(
        `LLM_PROVIDER=${env.LLM_PROVIDER} cannot read a card out yet — add it in src/llm/`,
      );
  }
}
