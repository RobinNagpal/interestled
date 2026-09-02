import type { NodeAudioT } from "@interestled/schemas";

/** What a player is holding: which recording, and how long its link is good for. */
export interface LoadedRecording {
  /**
   * The recording's identity — its `madeAt`, as milliseconds. Neither the URL
   * nor the object key can do this job: the URL is signed fresh on every read,
   * and the key is stable across a re-recording on purpose, so the object
   * overwrites its own rather than leaving one behind.
   */
  madeAt: number;
  /** When the signed link stops working, as milliseconds. */
  expiresAt: number;
}

/**
 * Whether what a player has already loaded is still worth pressing play on.
 *
 * A player holding a perfectly playable file can be holding the wrong one, in
 * two ways that look identical from inside it:
 *
 * - The card was written again. The recording of the old text is retired
 *   server-side, so the node answers with no recording at all — and resuming
 *   what is loaded would read out words that are no longer on the screen.
 * - The link expired. A recording is streamed from the bucket, so a signed URL
 *   that has passed its hour stops the playback at the next range request,
 *   which reaches the learner as a silence nobody can explain.
 *
 * Both mean the same thing: reload rather than resume. It is a rule rather than
 * three comparisons inline in the player because getting it wrong plays the
 * wrong card at somebody, which is the one failure this feature must not have.
 */
export function isLoadedRecordingCurrent(
  loaded: LoadedRecording | null,
  /** What the server says the card's recording is now, or null for none. */
  recorded: NodeAudioT | null,
  now: number = Date.now(),
): boolean {
  return (
    loaded !== null &&
    recorded !== null &&
    recorded.madeAt.getTime() === loaded.madeAt &&
    now < loaded.expiresAt
  );
}
