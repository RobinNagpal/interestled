import { LlmProviderId } from "@learnloop/schemas";
import { z } from "zod";
import { GenerationError } from "../errors";
import type { GenerateRequest, LlmProvider } from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Only the fields we read. A non-strict object ignores everything else Google sends. */
const GeminiResponse = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string() })) }) }))
    .min(1),
});

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
        // A blocked or truncated response has candidates missing rather than malformed.
        throw new GenerationError("Gemini returned no usable candidate");
      }
      return parsed.data.candidates[0]!.content.parts.map((part) => part.text).join("");
    },
  };
}
