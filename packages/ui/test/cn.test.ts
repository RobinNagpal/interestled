import { describe, expect, it } from "vitest";
import { cn } from "../src/ui/utils";

/**
 * `cn` is what lets a vendored component state a default and a call site
 * override it. Every one of these is a silent failure if it regresses: two
 * conflicting classes both reach NativeWind, and which one wins is whichever
 * the stylesheet emitted last — the button renders, and renders wrong.
 */
describe("cn", () => {
  it("keeps the last of two conflicting classes", () => {
    expect(cn("bg-primary", "bg-secondary")).toBe("bg-secondary");
    expect(cn("text-base", "text-xs")).toBe("text-xs");
  });

  it("knows the card radius is a radius", () => {
    expect(cn("rounded-md", "rounded-card")).toBe("rounded-card");
    expect(cn("rounded-card", "rounded-md")).toBe("rounded-md");
    // The sheet rounds only its top corners, so the side-specific form has to
    // resolve against the same token.
    expect(cn("rounded-t-lg", "rounded-t-card")).toBe("rounded-t-card");
  });

  it("separates a palette colour from a font size", () => {
    // `ink-faint` is not a size, so it may only ever displace another colour.
    expect(cn("text-foreground text-base", "text-ink-faint")).toBe("text-base text-ink-faint");
  });

  it("keeps classes that do not conflict", () => {
    expect(cn("flex-row items-center", "gap-2")).toBe("flex-row items-center gap-2");
  });

  it("drops the falsy branches a conditional class leaves behind", () => {
    const disabled = false;
    expect(cn("bg-primary", disabled && "opacity-50", undefined, "px-4")).toBe("bg-primary px-4");
  });
});
