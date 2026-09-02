import { describe, expect, it } from "vitest";
import { isLoadedRecordingCurrent } from "../src/audio";
import type { LoadedRecording } from "../src/audio";
import type { NodeAudioT } from "@interestled/schemas";

const NOW = Date.UTC(2026, 8, 2, 12, 0, 0);
const MADE_AT = new Date(Date.UTC(2026, 8, 2, 11, 55, 0));

function recording(overrides: Partial<NodeAudioT> = {}): NodeAudioT {
  return {
    url: "https://bucket.example/robin/k8s/pods/n1-d2.wav?sig=x",
    expiresAt: new Date(NOW + 60 * 60 * 1000),
    seconds: 91,
    voice: "Kore",
    madeAt: MADE_AT,
    ...overrides,
  };
}

const loaded: LoadedRecording = {
  madeAt: MADE_AT.getTime(),
  expiresAt: NOW + 30 * 60 * 1000,
};

describe("isLoadedRecordingCurrent", () => {
  it("resumes what is loaded when it is still the recording the server has", () => {
    expect(isLoadedRecordingCurrent(loaded, recording(), NOW)).toBe(true);
  });

  it("refuses to resume a recording of a card that has been written again", () => {
    // The failure this exists to stop: press play, press "write it again", then
    // press play. The card's recording is retired server-side, so the node
    // answers with none — and a player that only asked "have I loaded
    // something?" would read out the words that are no longer on the screen.
    expect(isLoadedRecordingCurrent(loaded, null, NOW)).toBe(false);
  });

  it("refuses to resume when the server's recording is a different one", () => {
    const remade = recording({ madeAt: new Date(MADE_AT.getTime() + 1000) });
    expect(isLoadedRecordingCurrent(loaded, remade, NOW)).toBe(false);
  });

  it("reloads rather than resuming once the signed link has expired", () => {
    // A recording is streamed, so an expired URL does not fail on the press —
    // it stops partway through, which is a silence with no explanation.
    expect(isLoadedRecordingCurrent(loaded, recording(), loaded.expiresAt + 1)).toBe(false);
    expect(isLoadedRecordingCurrent(loaded, recording(), loaded.expiresAt - 1)).toBe(true);
  });

  it("has nothing to resume before anything is loaded", () => {
    expect(isLoadedRecordingCurrent(null, recording(), NOW)).toBe(false);
    expect(isLoadedRecordingCurrent(null, null, NOW)).toBe(false);
  });
});
