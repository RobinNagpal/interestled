import type { LlmProviderId } from "@interestled/schemas";

export interface SpeakRequest {
  /** The words to say, and only those: the provider adds no instructions of its own. */
  text: string;
  /** A prebuilt voice name on the provider's side — NARRATION_VOICE by default. */
  voice: string;
}

/** Raw audio as the provider returned it, with the type it said it was. */
export interface Speech {
  audio: Buffer;
  /** e.g. `audio/L16;codec=pcm;rate=24000`. The rate is read out of it. */
  mimeType: string;
}

/**
 * What a provider must implement to read a card out. Separate from LlmProvider
 * rather than a second method on it, for the reason that interface has exactly
 * one method in the first place: a provider has one job. Text and speech are
 * answered by different models on the same service, they fail in different
 * ways, and everything above them wants one or the other and never both.
 */
export interface SpeechProvider {
  readonly id: LlmProviderId;
  readonly model: string;
  speak(request: SpeakRequest): Promise<Speech>;
}
