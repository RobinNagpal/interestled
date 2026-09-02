import { GenerationError } from "../errors";

/**
 * Gemini answers a speech call with raw PCM samples and no container: linear
 * 16-bit, one channel, at the rate named in the part's mime type. Nothing plays
 * that. A browser's `<audio>` element, the Android media player and every
 * command-line tool all want a header saying what the bytes are, so the 44
 * bytes below are what stands between the reply and a play button that works.
 *
 * WAV rather than MP3 because there is no encoder here to make one: ffmpeg is
 * not on the shared host and shipping one would be a second application on a
 * box that already runs two. The cost is size — 16-bit mono at 24 kHz is 48 KB
 * a second, so a four-minute narration is about eleven megabytes, which is why
 * the object is fetched once and cached rather than streamed on every press.
 */

/** Linear PCM, which is what `codec=pcm` in Gemini's mime type means. */
const PCM_FORMAT = 1;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const HEADER_BYTES = 44;

/** What Gemini's TTS models return today, and the fallback when the type is silent. */
export const DEFAULT_SAMPLE_RATE = 24000;

const RATE = /rate=(\d+)/i;

/**
 * The sample rate out of `audio/L16;codec=pcm;rate=24000`.
 *
 * Read rather than assumed because getting it wrong is not an error: the file
 * is valid and plays at the wrong speed, which sounds like a bad model rather
 * than a bug in this file. A type with no rate in it falls back to the rate
 * these models actually use.
 */
export function sampleRateOf(mimeType: string): number {
  const match = RATE.exec(mimeType);
  const rate = match === null ? Number.NaN : Number(match[1]);
  return Number.isInteger(rate) && rate > 0 ? rate : DEFAULT_SAMPLE_RATE;
}

/** How long a block of samples runs, rounded down to the second the player shows. */
export function pcmSeconds(bytes: number, sampleRate: number): number {
  return Math.floor(bytes / (sampleRate * CHANNELS * (BITS_PER_SAMPLE / 8)));
}

/**
 * The samples, with a RIFF/WAVE header in front of them.
 *
 * Written by hand rather than pulled in: the header for one uncompressed mono
 * stream is a fixed 44 bytes with four numbers in it, and a dependency for that
 * is a dependency to keep up to date on a box shared with another application.
 */
export function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  if (pcm.length === 0) {
    throw new GenerationError("The speech model returned no audio");
  }
  const blockAlign = CHANNELS * (BITS_PER_SAMPLE / 8);
  const header = Buffer.alloc(HEADER_BYTES);
  header.write("RIFF", 0, "ascii");
  // Everything after this field: the rest of the header plus the samples.
  header.writeUInt32LE(HEADER_BYTES - 8 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  // 16 is the length of a PCM fmt chunk; anything else means extra fields.
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(PCM_FORMAT, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
