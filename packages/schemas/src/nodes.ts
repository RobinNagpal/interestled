import { z } from "zod";
import { CardInstructions } from "./cards";
import { Id } from "./ids";
import { NodePath, Slug } from "./slugs";
import { MAX_NODE_MINUTES, TopicArchetypeSchema } from "./topics";

/**
 * How deep a node may sit. A map is two levels now — headings and the nodes
 * under them — but rows built before that are three deep, and a cap of 2 would
 * refuse to read them. It stays at 3 until those are gone.
 */
export const MAX_NODE_DEPTH = 3;

/**
 * A node's state on the map. The order here is the order of advancement, and
 * only production can move a node past Seen — reading must never complete one,
 * or the map starts lying (docs/ux/README.md, ideal 1).
 */
export enum NodeStatus {
  Untouched = "untouched",
  Seen = "seen",
  Explained = "explained",
  Verified = "verified",
  Due = "due",
  Shaky = "shaky",
}

export const NodeStatusSchema = z.nativeEnum(NodeStatus);

/** Which way an edit moves a node among its siblings. */
export enum MoveDirection {
  Up = "up",
  Down = "down",
}

export const MoveDirectionSchema = z.nativeEnum(MoveDirection);

export const LearningNode = z.object({
  id: Id,
  topicId: Id,
  /** Null for a top-level node. Children are deleted with their parent. */
  parentId: Id.nullable(),
  /** Unique among its siblings; the last segment of `path`. */
  slug: Slug,
  /** Every ancestor slug joined by "/". This is what the URL carries. */
  path: NodePath,
  /** 1-based level, so `depth <= topic.levels` always holds. Derived from `path`. */
  depth: z.number().int().min(1).max(MAX_NODE_DEPTH),
  title: z.string().min(1).max(120),
  /** One sentence answering "what is this, really?". Shown on the map. */
  claim: z.string().min(1).max(300),
  /**
   * Honest estimate, and 0 on a branch, whose time is the sum of the leaves
   * underneath it — a group is not something you sit down and read.
   *
   * The ceiling is the longest sitting the read-time ladder offers. What keeps a
   * particular map's nodes short is the band in the prompt, set from that
   * topic's own averageReadTime; this is only the outer bound that stops a
   * generated map claiming a node takes an afternoon.
   */
  minutes: z.number().int().min(0).max(MAX_NODE_MINUTES),
  archetype: TopicArchetypeSchema,
  /** Position among its siblings, not within the topic. Edits swap two of these. */
  orderIndex: z.number().int().min(0),
  status: NodeStatusSchema,
  /** Advisory only. The UI shows these as a note; it never gates on them. */
  prerequisiteIds: z.array(Id),
  /** What the learner can do once this is verified. Progress is stated in these. */
  capability: z.string().min(1).max(200),
  /**
   * What the learner asked for this node's card in particular, appended to the
   * topic's standing instructions whenever the card is written. On the node
   * rather than on the card, so it survives the card being written again — it
   * is what the next writing is asked to honour, not a fact about the last one.
   *
   * Defaulted rather than required, for the deploy gap: the web bundle reaches
   * CloudFront before the API restarts, so for those seconds the new app is
   * parsing responses from the old one, which names no such field. Required
   * here would fail that parse on the map, every node and every card at once —
   * and the persisted cache cannot cover it, because a response shape change
   * is exactly when PERSISTED_CACHE_VERSION discards it. The column is NOT
   * NULL, so the default is never what the server's own reads use.
   */
  cardInstructions: CardInstructions.default(""),
  createdAt: z.coerce.date(),
});

const Key = z.string().min(1).max(60);

/**
 * A node the learner actually does: it has a card, a drill, and a time. Only
 * leaves carry minutes, because only a leaf is a thing you sit down and finish.
 */
export const GeneratedLeaf = z.object({
  key: Key,
  title: z.string().min(1).max(120),
  claim: z.string().min(1).max(300),
  minutes: z.number().int().min(1).max(MAX_NODE_MINUTES),
  capability: z.string().min(1).max(200),
  prerequisiteKeys: z.array(Key).max(6),
});

/** A group of leaves. Level 2 of a two-level map, level 3 of a three-level one. */
export const GeneratedSection = z.object({
  key: Key,
  title: z.string().min(1).max(120),
  claim: z.string().min(1).max(300),
  capability: z.string().min(1).max(200),
  nodes: z.array(GeneratedLeaf).min(2).max(8),
});

/** A group of sections. Only a three-level map has these. */
export const GeneratedArea = z.object({
  key: Key,
  title: z.string().min(1).max(120),
  claim: z.string().min(1).max(300),
  capability: z.string().min(1).max(200),
  sections: z.array(GeneratedSection).min(2).max(5),
});

/**
 * Keys become node ids, so a duplicate anywhere in the map would collapse two
 * nodes onto one row and fail the insert. Refusing it here is what lets
 * generateJson's retry name the problem instead of the database naming it.
 */
function refuseDuplicateKeys(keys: readonly string[], ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `the key "${key}" is used twice; every key in the map must be unique`,
      });
      return;
    }
    seen.add(key);
  }
}

export const GeneratedTwoLevelMap = z
  .object({
    archetype: TopicArchetypeSchema,
    sections: z.array(GeneratedSection).min(3).max(8),
  })
  .superRefine((map, ctx) => {
    refuseDuplicateKeys(
      map.sections.flatMap((section) => [section.key, ...section.nodes.map((node) => node.key)]),
      ctx,
    );
  });

export const GeneratedThreeLevelMap = z
  .object({
    archetype: TopicArchetypeSchema,
    areas: z.array(GeneratedArea).min(2).max(5),
  })
  .superRefine((map, ctx) => {
    refuseDuplicateKeys(
      map.areas.flatMap((area) => [
        area.key,
        ...area.sections.flatMap((section) => [section.key, ...section.nodes.map((node) => node.key)]),
      ]),
      ctx,
    );
  });

/** Children of one branch, when only that branch is being regenerated. */
export const GeneratedLeafChildren = z
  .object({ nodes: z.array(GeneratedLeaf).min(2).max(8) })
  .superRefine((children, ctx) => {
    refuseDuplicateKeys(children.nodes.map((node) => node.key), ctx);
  });

export const GeneratedSectionChildren = z
  .object({ sections: z.array(GeneratedSection).min(2).max(5) })
  .superRefine((children, ctx) => {
    refuseDuplicateKeys(
      children.sections.flatMap((section) => [
        section.key,
        ...section.nodes.map((node) => node.key),
      ]),
      ctx,
    );
  });

/**
 * The flat form everything downstream stores. The nested shapes above are what a
 * model can actually produce reliably — a flat list with a parentKey invites it
 * to name a parent that is not there — and this is what a row looks like, so the
 * two are kept apart and joined by the flatten functions below.
 */
export const GeneratedMapNode = z.object({
  key: Key,
  parentKey: Key.nullable(),
  depth: z.number().int().min(1).max(MAX_NODE_DEPTH),
  title: z.string().min(1).max(120),
  claim: z.string().min(1).max(300),
  /** 0 on a branch — see LearningNode.minutes. */
  minutes: z.number().int().min(0).max(MAX_NODE_MINUTES),
  capability: z.string().min(1).max(200),
  prerequisiteKeys: z.array(Key),
});

export const GeneratedMap = z.object({
  archetype: TopicArchetypeSchema,
  nodes: z.array(GeneratedMapNode).min(1),
});

export type LearningNodeT = z.infer<typeof LearningNode>;
export type GeneratedLeafT = z.infer<typeof GeneratedLeaf>;
export type GeneratedSectionT = z.infer<typeof GeneratedSection>;
export type GeneratedAreaT = z.infer<typeof GeneratedArea>;
export type GeneratedTwoLevelMapT = z.infer<typeof GeneratedTwoLevelMap>;
export type GeneratedThreeLevelMapT = z.infer<typeof GeneratedThreeLevelMap>;
export type GeneratedLeafChildrenT = z.infer<typeof GeneratedLeafChildren>;
export type GeneratedSectionChildrenT = z.infer<typeof GeneratedSectionChildren>;
export type GeneratedMapNodeT = z.infer<typeof GeneratedMapNode>;
export type GeneratedMapT = z.infer<typeof GeneratedMap>;

/** A branch, as a row: no minutes of its own and no prerequisites. */
function branch(
  group: { key: string; title: string; claim: string; capability: string },
  parentKey: string | null,
  depth: number,
): GeneratedMapNodeT {
  return {
    key: group.key,
    parentKey,
    depth,
    title: group.title,
    claim: group.claim,
    minutes: 0,
    capability: group.capability,
    prerequisiteKeys: [],
  };
}

function leaf(node: GeneratedLeafT, parentKey: string | null, depth: number): GeneratedMapNodeT {
  return { ...node, parentKey, depth };
}

/** One section and its leaves, flattened under `parentKey` at `depth`. */
export function flattenSection(
  section: GeneratedSectionT,
  parentKey: string | null,
  depth: number,
): GeneratedMapNodeT[] {
  return [
    branch(section, parentKey, depth),
    ...section.nodes.map((node) => leaf(node, section.key, depth + 1)),
  ];
}

export function flattenTwoLevelMap(map: GeneratedTwoLevelMapT): GeneratedMapT {
  return {
    archetype: map.archetype,
    nodes: map.sections.flatMap((section) => flattenSection(section, null, 1)),
  };
}

export function flattenThreeLevelMap(map: GeneratedThreeLevelMapT): GeneratedMapT {
  return {
    archetype: map.archetype,
    nodes: map.areas.flatMap((area) => [
      branch(area, null, 1),
      ...area.sections.flatMap((section) => flattenSection(section, area.key, 2)),
    ]),
  };
}

/** Regenerated children of a branch that sits one level above the leaves. */
export function flattenLeafChildren(
  children: GeneratedLeafChildrenT,
  parentKey: string,
  depth: number,
): GeneratedMapNodeT[] {
  return children.nodes.map((node) => leaf(node, parentKey, depth));
}

/** Regenerated children of a branch that sits two levels above the leaves. */
export function flattenSectionChildren(
  children: GeneratedSectionChildrenT,
  parentKey: string,
  depth: number,
): GeneratedMapNodeT[] {
  return children.sections.flatMap((section) => flattenSection(section, parentKey, depth));
}
