import { z } from "zod";

/**
 * The voices a learner may pick between, as Google's own prebuilt names.
 *
 * An enum rather than a plain string, because this one is chosen on a screen:
 * a value arriving from a client has to be refused at the boundary, and a name
 * the provider does not know fails at synthesis — minutes after the press, on
 * the row, where the sentence the learner gets is about a voice they did not
 * type. `NarrationVoiceSchema` is what refuses it.
 *
 * The values are Google's names exactly, not lower-cased like the other enums
 * here, because the name is what goes on the wire. A second spelling would be a
 * mapping table, and a mapping table is a second fact about the same thing.
 *
 * Eight of the thirty, and the cut is deliberate: a card is an explanation
 * rather than a performance, so the voices with character in them — the
 * excitable, the gravelly, the breathy — wear through a session. What is here
 * is even, clear or warm, which are the registers somebody explaining something
 * can hold for ten minutes. Adding one is a line here and a line of copy in
 * packages/ui; the set is the product's, not the provider's.
 *
 * `card_narrations.voice` stays a plain string on purpose. It records which
 * voice made a recording that already exists, and that may be one this enum has
 * since dropped — history has to survive the set changing under it.
 */
export enum NarrationVoice {
  /** Clear. The default: even, unhurried, and nothing in the way of the words. */
  Erinome = "Erinome",
  /** Even. */
  Schedar = "Schedar",
  /** Informative. */
  Charon = "Charon",
  /** Firm. */
  Kore = "Kore",
  /** Warm. */
  Sulafat = "Sulafat",
  /** Friendly. */
  Achird = "Achird",
  /** Knowledgeable. */
  Sadaltager = "Sadaltager",
  /** Gentle. */
  Vindemiatrix = "Vindemiatrix",
}

export const NarrationVoiceSchema = z.nativeEnum(NarrationVoice);

/** What a topic is read in until somebody changes it on the settings screen. */
export const DEFAULT_NARRATION_VOICE = NarrationVoice.Erinome;
