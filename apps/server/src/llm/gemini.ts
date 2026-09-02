import { LlmProviderId } from "@interestled/schemas";
import { z } from "zod";
import { GenerationError } from "../errors";
import type { GenerateRequest, LlmProvider } from "./types";
import type { SpeakRequest, Speech, SpeechProvider } from "./speech";

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

/**
 * Only the fields we read from a speech reply. The audio comes back inline
 * rather than as a link — one part, base64, with the encoding named in its own
 * mime type rather than in the docs — so `mimeType` is not decoration: it
 * carries the sample rate, and a WAV header written against the wrong rate
 * plays at the wrong speed rather than failing.
 */
const GeminiSpeechResponse = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(z.object({ inlineData: z.object({ mimeType: z.string(), data: z.string() }).optional() }))
              .optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .min(1),
});

/**
 * The same endpoint as the text call, asked for audio instead: a TTS model
 * answers :generateContent with one inline part rather than text.
 *
 * There is no system slot here and no JSON to parse. Everything about how the
 * card should sound is already in the script the content model wrote — a
 * speech model given instructions as well as words will read the instructions
 * out, which is the one way this call fails visibly.
 */
export function createGeminiSpeech(options: GeminiOptions): SpeechProvider {
  const doFetch = options.fetchImpl ?? fetch;
  return {
    id: LlmProviderId.Gemini,
    model: options.model,
    async speak(request: SpeakRequest): Promise<Speech> {
      const response = await doFetch(
        `${ENDPOINT}/${encodeURIComponent(options.model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": options.apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: request.text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: request.voice } },
              },
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
      const parsed = GeminiSpeechResponse.safeParse(body);
      if (!parsed.success) {
        throw new GenerationError("Gemini returned no usable candidate");
      }
      const candidate = parsed.data.candidates[0]!;
      const inline = (candidate.content?.parts ?? []).find((part) => part.inlineData !== undefined)
        ?.inlineData;
      if (inline === undefined) {
        // Said the same way the text path says it, and for the same reason: a
        // reply cut off at the token ceiling comes back with the reason set and
        // no parts at all, and "no audio" alone names neither cause nor fix.
        throw new GenerationError(
          candidate.finishReason === TRUNCATED
            ? "Gemini ran out of output tokens before it finished speaking"
            : `Gemini returned no audio (finish reason: ${candidate.finishReason ?? "not stated"})`,
        );
      }
      return { audio: Buffer.from(inline.data, "base64"), mimeType: inline.mimeType };
    },
  };
}
