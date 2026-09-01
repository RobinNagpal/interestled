import { LlmProviderId } from "@interestled/schemas";
import { z } from "zod";
import { GenerationError } from "../errors";
import type { GenerateRequest, LlmProvider } from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Only the fields we read. A non-strict object ignores everything else Google
 * sends.
 *
 * `parts` is optional and `finishReason` is read because of what a truncated
 * reply looks like: the candidate comes back with the reason set to MAX_TOKENS
 * and either half a JSON document or, on a model that thinks, no parts at all.
 * Both used to surface as "the model could not produce content in the required
 * shape", which names neither the cause nor the fix.
 */
const GeminiResponse = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({ parts: z.array(z.object({ text: z.string() })).optional() })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .min(1),
});

/** Gemini's word for "I hit maxOutputTokens", which is a budget bug, not a model one. */
const TRUNCATED = "MAX_TOKENS";

const GeminiError = z.object({ error: z.object({ message: z.string() }) });

export interface GeminiOptions {
  apiKey: string;
  model: string;
  /** Injectable so tests never reach the network. */
  fetchImpl?: typeof fetch;
}

/**
 * Talks to the REST endpoint directly rather than through @google/generative-ai:
 * one fetch call is the whole integration, and it keeps the Lambda bundle small.
 */
export function createGeminiProvider(options: GeminiOptions): LlmProvider {
  const doFetch = options.fetchImpl ?? fetch;
  return {
    id: LlmProviderId.Gemini,
    model: options.model,
    async complete(request: GenerateRequest): Promise<string> {
      const response = await doFetch(
        `${ENDPOINT}/${encodeURIComponent(options.model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": options.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.system }] },
            contents: [{ role: "user", parts: [{ text: request.prompt }] }],
            generationConfig: {
              temperature: request.temperature ?? 0.3,
              maxOutputTokens: request.maxOutputTokens ?? 4096,
              // Asking for JSON directly removes most of the parsing failures;
              // the schema check in generateJson still has to run regardless.
              responseMimeType: "application/json",
            },
          }),
        },
      );

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const parsed = GeminiError.safeParse(body);
        throw new GenerationError(
          parsed.success ? parsed.data.error.message : `Gemini returned ${response.status}`,
        );
      }
      const parsed = GeminiResponse.safeParse(body);
      if (!parsed.success) {
        // A blocked response has candidates missing rather than malformed.
        throw new GenerationError("Gemini returned no usable candidate");
      }
      const candidate = parsed.data.candidates[0]!;
      const text = (candidate.content?.parts ?? []).map((part) => part.text).join("");
      if (candidate.finishReason === TRUNCATED) {
        // Said plainly, because the answer is to raise maxOutputTokens for the
        // call that asked, and no amount of retrying will do it.
        throw new GenerationError(
          `Gemini ran out of output tokens after ${text.length} characters — the reply was cut off`,
        );
      }
      if (text === "") {
        throw new GenerationError(
          `Gemini returned no text (finish reason: ${candidate.finishReason ?? "not stated"})`,
        );
      }
      return text;
    },
  };
}
