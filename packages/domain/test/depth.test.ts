import { describe, expect, it } from "vitest";
import { CARD_MINUTES_MAX, READ_TIMES, Step } from "@interestled/schemas";
import { depthAfter, nextDefaultDepth, readTimeAfter } from "../src/depth";

describe("depthAfter", () => {
  it("moves one rung at a time", () => {
    expect(depthAfter(3, Step.Up)).toBe(4);
    expect(depthAfter(3, Step.Down)).toBe(2);
  });

  it("stops at the ends, so the screen can say the button is spent", () => {
    // A press that lands where it started is what made the old control look
    // broken: it refetched and returned the identical card.
    expect(depthAfter(1, Step.Down)).toBe(1);
    expect(depthAfter(5, Step.Up)).toBe(5);
  });
});

describe("readTimeAfter", () => {
  it("walks the ladder the chips offer", () => {
    expect(readTimeAfter(3, Step.Up, CARD_MINUTES_MAX)).toBe(4);
    expect(readTimeAfter(5, Step.Up, CARD_MINUTES_MAX)).toBe(7);
    expect(readTimeAfter(7, Step.Down, CARD_MINUTES_MAX)).toBe(5);
  });

  it("lands on the ladder from a number that is not on it", () => {
    // A node's own estimate is any whole number of minutes, not a rung.
    expect(readTimeAfter(6, Step.Up, CARD_MINUTES_MAX)).toBe(7);
    expect(readTimeAfter(6, Step.Down, CARD_MINUTES_MAX)).toBe(5);
  });

  it("stops at one minute and at what a card may be written to", () => {
    expect(readTimeAfter(1, Step.Down, CARD_MINUTES_MAX)).toBe(1);
    expect(readTimeAfter(CARD_MINUTES_MAX, Step.Up, CARD_MINUTES_MAX)).toBe(CARD_MINUTES_MAX);
    // The ceiling is below the ladder's top, and nothing may step past it.
    expect(READ_TIMES[READ_TIMES.length - 1]).toBeGreaterThan(CARD_MINUTES_MAX);
    expect(readTimeAfter(15, Step.Up, CARD_MINUTES_MAX)).toBe(15);
  });
});

describe("nextDefaultDepth", () => {
  it("averages rather than jumping, so one tangent does not relevel the topic", () => {
    expect(nextDefaultDepth(2, 4)).toBe(3);
    expect(nextDefaultDepth(3, 3)).toBe(3);
  });
});
