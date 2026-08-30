import { describe, expect, it } from "vitest";
import { DepthAction } from "@learnloop/schemas";
import { depthAfter, nextDefaultDepth } from "../src/depth";

describe("depthAfter", () => {
  it("moves only for simpler and deeper", () => {
    expect(depthAfter(3, DepthAction.Deeper)).toBe(4);
    expect(depthAfter(3, DepthAction.Simpler)).toBe(2);
    expect(depthAfter(3, DepthAction.WhyItMatters)).toBe(3);
    expect(depthAfter(3, DepthAction.MoreConcrete)).toBe(3);
  });

  it("clamps at both ends", () => {
    expect(depthAfter(1, DepthAction.Simpler)).toBe(1);
    expect(depthAfter(5, DepthAction.Deeper)).toBe(5);
  });
});

describe("nextDefaultDepth", () => {
  it("drifts toward the depth actually used rather than jumping", () => {
    expect(nextDefaultDepth(2, 4)).toBe(3);
    expect(nextDefaultDepth(3, 3)).toBe(3);
  });
});
