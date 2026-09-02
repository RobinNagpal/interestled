import { describe, expect, it } from "vitest";
import { DEFAULT_SAMPLE_RATE, pcmSeconds, pcmToWav, sampleRateOf } from "../src/audio/wav";
import { GenerationError } from "../src/errors";

/** One second of silence at the rate Gemini's TTS models answer at. */
function silence(seconds: number, rate = DEFAULT_SAMPLE_RATE): Buffer {
  return Buffer.alloc(seconds * rate * 2);
}

describe("sampleRateOf", () => {
  it("reads the rate out of the type the audio came back with", () => {
    // Getting this wrong is not an error: the file is valid and plays at the
    // wrong speed, which sounds like a bad model rather than a bug here.
    expect(sampleRateOf("audio/L16;codec=pcm;rate=24000")).toBe(24000);
    expect(sampleRateOf("audio/L16;codec=pcm;rate=16000")).toBe(16000);
  });

  it("falls back to what these models actually use when the type is silent", () => {
    expect(sampleRateOf("audio/L16;codec=pcm")).toBe(DEFAULT_SAMPLE_RATE);
    expect(sampleRateOf("nonsense")).toBe(DEFAULT_SAMPLE_RATE);
    expect(sampleRateOf("audio/L16;rate=nope")).toBe(DEFAULT_SAMPLE_RATE);
  });
});

describe("pcmToWav", () => {
  it("writes a header a player will accept", () => {
    const wav = pcmToWav(silence(1), 24000);
    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wav.subarray(12, 16).toString("ascii")).toBe("fmt ");
    expect(wav.subarray(36, 40).toString("ascii")).toBe("data");
    // 1 is linear PCM, one channel, 16 bits — what `codec=pcm` means.
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt16LE(34)).toBe(16);
  });

  it("states the sizes the two length fields have to agree with", () => {
    const pcm = silence(2);
    const wav = pcmToWav(pcm, 24000);
    expect(wav.length).toBe(pcm.length + 44);
    // RIFF size is everything after its own field; data size is the samples.
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
    expect(wav.readUInt32LE(40)).toBe(pcm.length);
  });

  it("carries the rate it was given rather than one of its own", () => {
    const wav = pcmToWav(silence(1, 16000), 16000);
    expect(wav.readUInt32LE(24)).toBe(16000);
    // Byte rate is the rate times the block, which is what makes a player show
    // the right length rather than one scaled by the ratio of the two.
    expect(wav.readUInt32LE(28)).toBe(16000 * 2);
    expect(wav.readUInt16LE(32)).toBe(2);
  });

  it("refuses to write a header over nothing", () => {
    // A model that answered with an empty part would otherwise produce a valid
    // file with no sound in it, which reads as a player bug.
    expect(() => pcmToWav(Buffer.alloc(0), 24000)).toThrow(GenerationError);
  });
});

describe("pcmSeconds", () => {
  it("is the length the player will show", () => {
    expect(pcmSeconds(silence(90).length, DEFAULT_SAMPLE_RATE)).toBe(90);
  });

  it("rounds down, so a recording never claims a second it does not have", () => {
    expect(pcmSeconds(DEFAULT_SAMPLE_RATE * 2 + 10, DEFAULT_SAMPLE_RATE)).toBe(1);
    expect(pcmSeconds(0, DEFAULT_SAMPLE_RATE)).toBe(0);
  });
});
