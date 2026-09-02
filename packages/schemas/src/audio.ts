import { z } from "zod";
import { CARD_MINUTES_MAX, CardMinutes } from "./cards";
import { Id } from "./ids";

/**
 * Which generation of the narration prompt made a stored recording.
 *
 * The same device CARD_PROMPT_REVISION is: audio is expensive to make and kept
 * forever, so a rewritten narration.md would otherwise reach nobody who had
 * already pressed play. The revision is part of the object key, and the row
 * stores the key it was written to — so a bump makes every stored recording
 * miss its own lookup and the next press writes a new one, with no migration
 * and nothing to delete.
 *
 * Bump it when a change to narration.md changes how an existing card should
 * sound.
 */
export const NARRATION_PROMPT_REVISION = 1;

/**
 * One of Google's prebuilt voice names, as a plain string for the same reason
 * LLM_MODEL is one: it names something on the provider's side, and the set is
 * theirs to change. Stored on the row so a recording can say which voice made
 * it after the constant here has moved on.
 *
 * Kore is the even, unhurried one. A card is an explanation rather than a
 * performance, and the voices with character in them wear through a session.
 */
export const NARRATION_VOICE = "Kore";

/**
 * Speech is slower than reading. 200 words a minute is ordinary adult prose off
 * a page (WORDS_PER_MINUTE); said aloud at a pace somebody can follow while
 * doing something else, the same words take half again as long.
 *
 * It is what turns a card's read time into a spoken length, and it is why the
 * narration is not simply the card read out: a three-minute card read aloud is
 * four and a half minutes, and the parts that carry the least — the notation,
 * the code, the exact figures — are the parts that cost the most to say.
 */
export const SPOKEN_WORDS_PER_MINUTE = 150;

/** How long the narration of a card of this length should run, in words. */
export function narrationWords(minutes: number): number {
  return CardMinutes.parse(minutes) * SPOKEN_WORDS_PER_MINUTE;
}

/**
 * The outer bound on a script, as characters. Derived from the longest card the
 * product writes rather than chosen, so a length the prompt asks for can never
 * be one the schema refuses — the same relationship MAX_MECHANISM_SECTIONS has
 * to the card prompt. Six characters a word is English including its spaces,
 * and the quarter of slack is the range the prompt is allowed to land in.
 */
const CHARACTERS_PER_WORD = 6;

export const NARRATION_SCRIPT_MAX = Math.ceil(
  CARD_MINUTES_MAX * SPOKEN_WORDS_PER_MINUTE * CHARACTERS_PER_WORD * 1.25,
);

/**
 * What the model writes: the words to be spoken, and nothing else.
 *
 * One string rather than a slot per section of the card, because it is read
 * end to end in one pass and the joins between the sections are the part that
 * has to be written rather than assembled — a recording assembled from six
 * separately-written slots is six openings.
 */
export const NarrationScript = z.object({
  script: z.string().min(1).max(NARRATION_SCRIPT_MAX),
});

export type NarrationScriptT = z.infer<typeof NarrationScript>;

/**
 * Where a recording lives in the audio bucket.
 *
 * Readable rather than hashed, and built from the slugs the URLs are already
 * built from: `robin/kubernetes/scheduling/taints/n1-d2-r6-base-3-….wav` says
 * whose it is, which topic, and where on the map, so the bucket can be read by
 * a person looking for one file. The learner's slug is the top folder because
 * a node belongs to exactly one topic, which belongs to exactly one account —
 * nothing is shared, so nothing collides across accounts.
 *
 * The file name is the card's identity: the narration revision, the depth, and
 * the card variant, which between them are everything that decides what was
 * said. So a card rewritten at the same settings overwrites its own recording
 * rather than leaving one behind, and a card written at different settings gets
 * its own. The variant's separator is swapped for a hyphen because the pieces
 * inside it already use underscores, and a key is easier to read when the two
 * levels are told apart.
 */
export function narrationKey(input: {
  userSlug: string;
  topicSlug: string;
  nodePath: string;
  depth: number;
  /** cardVariant(settings) — what the card the recording is of was written to. */
  variant: string;
}): string {
  const file = [
    `n${NARRATION_PROMPT_REVISION}`,
    `d${input.depth}`,
    input.variant.split("|").join("-"),
  ].join("-");
  return `${input.userSlug}/${input.topicSlug}/${input.nodePath}/${file}.wav`;
}

/**
 * A card read aloud: the script it was made from, and where the audio sits.
 *
 * The script is kept as well as the audio because it is the expensive half —
 * making it is a model call against the whole card, where saying it again is
 * not — and because it is the only readable record of what a recording
 * contains.
 */
export const CardNarration = z.object({
  id: Id,
  cardId: Id,
  script: z.string().min(1).max(NARRATION_SCRIPT_MAX),
  objectKey: z.string().min(1).max(1024),
  seconds: z.number().int().min(0),
  bytes: z.number().int().min(0),
  voice: z.string().min(1).max(64),
  createdAt: z.coerce.date(),
});

export type CardNarrationT = z.infer<typeof CardNarration>;

/**
 * What the app is given: somewhere to play from, and how long it runs.
 *
 * The URL is signed and short-lived rather than public, because a recording is
 * one learner's card read aloud — the bucket blocks public access, and the
 * expiry is why every read of this route mints a new one instead of the app
 * keeping the last.
 */
export const NodeAudio = z.object({
  url: z.string().min(1),
  expiresAt: z.coerce.date(),
  seconds: z.number().int().min(0),
  voice: z.string().min(1).max(64),
});

/** Null before anything has been recorded for the card on screen. */
export const NodeAudioView = z.object({ audio: NodeAudio.nullable() });

/**
 * What the press answers with. Not nullable, unlike the view above: asking for
 * a recording either produces one or fails, so a schema that allowed null would
 * make every call site handle a case the route cannot produce.
 */
export const NodeAudioResult = z.object({ audio: NodeAudio });

export type NodeAudioT = z.infer<typeof NodeAudio>;
export type NodeAudioViewT = z.infer<typeof NodeAudioView>;
export type NodeAudioResultT = z.infer<typeof NodeAudioResult>;
