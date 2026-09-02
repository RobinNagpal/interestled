import { describe, expect, it } from "vitest";
import {
  NodePath,
  emailSlug,
  RESERVED_SLUGS,
  SLUG_MAX_LENGTH,
  Slug,
  depthOfPath,
  joinPath,
  parentPath,
  slugOfPath,
  slugStem,
  slugify,
  uniqueSlug,
} from "../src/slugs";

describe("slugify", () => {
  it("turns a title into one readable URL segment", () => {
    expect(slugify("The reconciliation loop")).toBe("the-reconciliation-loop");
  });

  it("collapses punctuation and trims the ends, so no slug starts or ends in a hyphen", () => {
    expect(slugify("  Kubernetes!!  ")).toBe("kubernetes");
    expect(slugify("C++ / Rust: a comparison")).toBe("c-rust-a-comparison");
  });

  it("strips accents rather than dropping the letter under them", () => {
    expect(slugify("Café résumé")).toBe("cafe-resume");
  });

  it("falls back rather than producing an empty segment", () => {
    // A title with nothing a URL can carry is a real case, not a bug: the map
    // is generated, and "日本語" is a perfectly good node title.
    expect(slugify("日本語")).toBe("item");
    expect(slugify("🎉", "node")).toBe("node");
  });

  it("stays inside what the Slug schema accepts, however long the title", () => {
    const slug = slugify("a very long title ".repeat(20));
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(Slug.safeParse(slug).success).toBe(true);
  });
});

describe("uniqueSlug", () => {
  it("keeps the clean slug when it is free", () => {
    expect(uniqueSlug("Pods", new Set())).toBe("pods");
  });

  it("numbers a repeat rather than overwriting it", () => {
    const taken = new Set(["pods"]);
    expect(uniqueSlug("Pods", taken)).toBe("pods-2");
    expect(uniqueSlug("Pods", new Set([...taken, "pods-2"]))).toBe("pods-3");
  });

  it("never hands out a segment the router owns", () => {
    // A node titled "Edit" would otherwise sit at /topic/x/edit and shadow the
    // edit screen itself.
    for (const reserved of RESERVED_SLUGS) {
      expect(uniqueSlug(reserved, new Set())).not.toBe(reserved);
    }
  });

  it("leaves room for the suffix instead of overflowing the length cap", () => {
    const title = "a very long title ".repeat(20);
    const first = uniqueSlug(title, new Set());
    const second = uniqueSlug(title, new Set([first]));
    expect(second).not.toBe(first);
    expect(second.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(Slug.safeParse(second).success).toBe(true);
  });
});

describe("paths", () => {
  it("reads back the slug and the depth a path encodes", () => {
    expect(slugOfPath("scheduling/taints")).toBe("taints");
    expect(depthOfPath("scheduling/taints")).toBe(2);
    expect(depthOfPath("scheduling")).toBe(1);
  });

  it("knows a top-level node has no parent path", () => {
    expect(parentPath("scheduling")).toBeNull();
    expect(parentPath("areas/scheduling/taints")).toBe("areas/scheduling");
  });

  it("joins a parent and a slug into a path the schema accepts", () => {
    expect(joinPath(null, "scheduling")).toBe("scheduling");
    expect(NodePath.safeParse(joinPath("scheduling", "taints")).success).toBe(true);
  });

  it("refuses a path that is not slugs joined by slashes", () => {
    expect(NodePath.safeParse("Scheduling/Taints").success).toBe(false);
    expect(NodePath.safeParse("scheduling//taints").success).toBe(false);
  });
});

describe("emailSlug", () => {
  it("takes the part before the @, which is the closest thing to a username", () => {
    expect(emailSlug("robin@gmail.com")).toBe("robin");
    expect(emailSlug("Robin.Nagpal+news@gmail.com")).toBe("robin-nagpal-news");
  });

  it("falls back rather than producing a folder with no name", () => {
    // Not a hypothetical: the local part only has to be non-empty, so "..@x.com"
    // is a valid address that slugifies to nothing.
    expect(emailSlug("..@weird.example")).toBe("learner");
  });

  it("does not decide uniqueness, which is uniqueSlug's job", () => {
    // Two providers, one local part. The folders must not be the same folder,
    // and this function is not what stops that happening.
    expect(emailSlug("robin@gmail.com")).toBe(emailSlug("robin@outlook.com"));
    expect(uniqueSlug(emailSlug("robin@outlook.com"), new Set(["robin"]))).toBe("robin-2");
  });

  it("stays inside what the Slug schema accepts, however long the address", () => {
    const slug = emailSlug(`${"a".repeat(120)}@example.com`);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(Slug.safeParse(slug).success).toBe(true);
  });
});

describe("slugStem", () => {
  it("is what every numbered variant of a slug starts with", () => {
    // The reason this is exported at all: uniqueSlug cuts a long base short
    // before numbering it, so the variants of a 58-character base do not start
    // with those 58 characters. Anything searching for "slugs that could
    // collide with this one" has to search on the stem, or it misses exactly
    // the ones it allocated last time and proposes them again forever.
    const base = "a".repeat(58);
    const numbered = uniqueSlug(base, new Set([base]));
    expect(numbered.startsWith(base)).toBe(false);
    expect(numbered.startsWith(slugStem(base))).toBe(true);
  });

  it("leaves a short slug exactly as it is", () => {
    expect(slugStem("robin")).toBe("robin");
  });

  it("never leaves a trailing hyphen for the suffix to double", () => {
    // "foo--2" is not a slug the schema accepts.
    const stem = slugStem(`${"a".repeat(54)}-b`);
    expect(stem.endsWith("-")).toBe(false);
    expect(Slug.safeParse(`${stem}-2`).success).toBe(true);
  });
});
