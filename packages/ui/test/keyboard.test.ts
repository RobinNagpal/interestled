import { describe, expect, it } from "vitest";
import { keyboardOverlap } from "../src/keyboard";

/**
 * What the keyboard covers, from the two heights the browser reports. This is
 * the whole of the fix on the web, and every way of getting it wrong renders:
 * too small and the field stays hidden, too eager and the form jumps around
 * while nobody is typing.
 */
describe("keyboardOverlap", () => {
  it("is the part of the page the keyboard is drawn over", () => {
    // The layout viewport keeps its height and the keyboard takes 336 of it.
    expect(keyboardOverlap(844, 508, 0)).toBe(336);
  });

  it("counts from where the page has been scrolled to", () => {
    // Safari scrolls the page up to reveal a field, which moves the visible
    // part down the document without changing how much of it there is.
    expect(keyboardOverlap(844, 508, 120)).toBe(216);
  });

  it("is nothing when the keyboard is closed", () => {
    expect(keyboardOverlap(844, 844, 0)).toBe(0);
  });

  it("ignores the browser's own chrome moving", () => {
    // The URL bar collapsing and expanding is worth tens of pixels, and taking
    // it for a keyboard would resize the form under someone reading it.
    expect(keyboardOverlap(844, 760, 0)).toBe(0);
  });

  it("adds nothing where the browser has already made room", () => {
    // A browser told to resize the layout viewport shrinks both heights
    // together, so there is nothing left over to pad.
    expect(keyboardOverlap(508, 508, 0)).toBe(0);
  });
});
