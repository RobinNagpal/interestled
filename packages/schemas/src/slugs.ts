import { z } from "zod";

/** Long enough for a six-word title, short enough to keep a three-level URL readable. */
export const SLUG_MAX_LENGTH = 60;

/**
 * One URL segment: lower case, digits, single hyphens, never empty. Every topic
 * and every node has one, because URLs are built from titles rather than ids —
 * /topic/kubernetes/scheduling/taints says where it goes and an id says nothing.
 */
export const Slug = z
  .string()
  .min(1)
  .max(SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "a slug is lower-case words joined by hyphens");

/**
 * The whole ancestor chain, slugs joined by "/". This is what a URL carries and
 * what the database indexes: a path is unique inside its topic, which — because
 * siblings share a parent path — is the same statement as "a slug is unique
 * among its siblings", but one Postgres can actually enforce. A plain
 * UNIQUE(parent_id, slug) could not: NULLs never compare equal, so every
 * top-level node would be exempt from it.
 */
export const NodePath = z
  .string()
  .min(1)
  .max(400)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/, "a path is slugs joined by /");

export type SlugT = z.infer<typeof Slug>;
export type NodePathT = z.infer<typeof NodePath>;

/**
 * Segments the router owns. A node titled "Edit" would otherwise slugify onto
 * /topic/x/edit and shadow the edit screen, so the allocator treats these as
 * already taken everywhere rather than only where they would actually collide —
 * one rule is easier to keep true than four.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "new",
  "edit",
  "drill",
  "api",
  "topic",
  "node",
  // GET /api/topics/defaults answers with the default content instructions, so a
  // topic that took this slug would be unreachable behind it.
  "defaults",
];

/** The slug for one title, before any collision is resolved. */
export function slugify(text: string, fallback = "item"): SlugT {
  const slug = text
    // Decompose accents so "café" becomes "cafe" rather than "caf".
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, "");
  return slug === "" ? fallback : slug;
}

/** How many suffixes to try before giving up on a readable slug. */
const MAX_SUFFIX = 200;

/**
 * slugify, then "-2", "-3" … until the result is free. `taken` is every slug
 * already used at this level plus, implicitly, the reserved words. Nothing is
 * mutated: the caller adds the result to its own set.
 */
export function uniqueSlug(text: string, taken: ReadonlySet<string>, fallback = "item"): SlugT {
  const base = slugify(text, fallback);
  const isFree = (candidate: string): boolean =>
    !taken.has(candidate) && !RESERVED_SLUGS.includes(candidate);
  if (isFree(base)) {
    return base;
  }
  // Leave room for the suffix rather than producing a 63-character slug.
  const stem = base.slice(0, SLUG_MAX_LENGTH - 5).replace(/-+$/g, "") || fallback;
  for (let suffix = 2; suffix <= MAX_SUFFIX; suffix += 1) {
    const candidate = `${stem}-${suffix}`;
    if (isFree(candidate)) {
      return candidate;
    }
  }
  // 200 siblings with the same title is not a real map, but a readable slug is a
  // nicety and a unique one is a constraint, so the constraint wins.
  return `${stem}-${Date.now().toString(36)}`;
}

/** The last segment of a path — the node's own slug. */
export function slugOfPath(path: string): SlugT {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
}

/** 1 for a top-level node, 2 for its children, 3 for theirs. */
export function depthOfPath(path: string): number {
  return path.split("/").length;
}

/** The path of a node's parent, or null when it is top level. */
export function parentPath(path: string): string | null {
  const index = path.lastIndexOf("/");
  return index === -1 ? null : path.slice(0, index);
}

/** Join a parent path (null at the top) with a child slug. */
export function joinPath(parent: string | null, slug: string): NodePathT {
  return parent === null ? slug : `${parent}/${slug}`;
}
