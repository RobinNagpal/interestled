import { describe, expect, it } from "vitest";
import { nextDefaultDepth } from "../src/depth";

describe("nextDefaultDepth", () => {
  it("averages rather than jumping, so one tangent does not relevel the topic", () => {
    expect(nextDefaultDepth(2, 4)).toBe(3);
    expect(nextDefaultDepth(3, 3)).toBe(3);
  });

  it("stays on the scale", () => {
    expect(nextDefaultDepth(1, 1)).toBe(1);
    expect(nextDefaultDepth(5, 5)).toBe(5);
  });
});
