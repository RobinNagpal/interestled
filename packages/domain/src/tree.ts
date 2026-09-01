import type { LearningNodeT } from "@interestled/schemas";

/** One node with everything under it, ready to render as an indented list. */
export interface NodeTreeT {
  node: LearningNodeT;
  children: NodeTreeT[];
}

function bySiblingOrder(a: NodeTreeT, b: NodeTreeT): number {
  return a.node.orderIndex - b.node.orderIndex;
}

/**
 * The map as a tree. orderIndex is a position among siblings rather than within
 * the topic, so ordering happens per level here and an edit only ever has to
 * touch the two rows it swaps.
 */
export function buildTree(nodes: readonly LearningNodeT[]): NodeTreeT[] {
  const byId = new Map<string, NodeTreeT>(
    nodes.map((node) => [node.id, { node, children: [] }]),
  );
  const roots: NodeTreeT[] = [];
  for (const node of nodes) {
    const entry = byId.get(node.id);
    if (entry === undefined) {
      continue;
    }
    const parent = node.parentId === null ? undefined : byId.get(node.parentId);
    // A node whose parent is missing would otherwise vanish from the map
    // entirely; showing it at the top is the honest failure.
    if (parent === undefined) {
      roots.push(entry);
    } else {
      parent.children.push(entry);
    }
  }
  for (const entry of byId.values()) {
    entry.children.sort(bySiblingOrder);
  }
  roots.sort(bySiblingOrder);
  return roots;
}

/**
 * The flat list in reading order: each node followed by everything under it.
 * orderIndex only ranks siblings, so sorting the flat list by it directly would
 * interleave the levels; walking the tree is what turns "third under its parent"
 * back into a single sequence.
 */
export function inMapOrder(nodes: readonly LearningNodeT[]): LearningNodeT[] {
  const ordered: LearningNodeT[] = [];
  const walk = (entries: readonly NodeTreeT[]): void => {
    for (const entry of entries) {
      ordered.push(entry.node);
      walk(entry.children);
    }
  };
  walk(buildTree(nodes));
  return ordered;
}

/**
 * Whether anything hangs off this node. Derived rather than stored: deleting a
 * branch's last child turns it into a leaf, and a stored flag would be a second
 * fact about the same thing that edits could put out of step with the first.
 */
export function isBranch(node: LearningNodeT, nodes: readonly LearningNodeT[]): boolean {
  return nodes.some((candidate) => candidate.parentId === node.id);
}

/**
 * The nodes a learner actually does. Branches are grouping only — they have no
 * card, no drill and no minutes — so every count, every capability and every
 * session step is drawn from these and never from the whole list.
 */
export function leafNodes(nodes: readonly LearningNodeT[]): LearningNodeT[] {
  const parents = new Set(
    nodes.map((node) => node.parentId).filter((id): id is string => id !== null),
  );
  return nodes.filter((node) => !parents.has(node.id));
}

/** Every node under this one, at any depth, excluding the node itself. */
export function descendantsOf(
  node: LearningNodeT,
  nodes: readonly LearningNodeT[],
): LearningNodeT[] {
  const prefix = `${node.path}/`;
  return nodes.filter((candidate) => candidate.path.startsWith(prefix));
}

/** The chain from the top-level node down to this one's parent, in that order. */
export function ancestorsOf(
  node: LearningNodeT,
  nodes: readonly LearningNodeT[],
): LearningNodeT[] {
  const byPath = new Map(nodes.map((candidate) => [candidate.path, candidate]));
  const segments = node.path.split("/");
  const chain: LearningNodeT[] = [];
  for (let count = 1; count < segments.length; count += 1) {
    const found = byPath.get(segments.slice(0, count).join("/"));
    if (found !== undefined) {
      chain.push(found);
    }
  }
  return chain;
}

/** The node a URL names, or null when the path does not exist in this topic. */
export function nodeByPath(
  nodes: readonly LearningNodeT[],
  path: string,
): LearningNodeT | null {
  return nodes.find((node) => node.path === path) ?? null;
}

/**
 * Reading time for a row on the map: its own for a leaf, the sum of the leaves
 * under it for a branch. Rolling up is what makes a collapsed group honest about
 * what opening it costs.
 */
export function rollupMinutes(node: LearningNodeT, nodes: readonly LearningNodeT[]): number {
  const under = descendantsOf(node, nodes);
  if (under.length === 0) {
    return node.minutes;
  }
  return leafNodes(nodes)
    .filter((leaf) => leaf.path.startsWith(`${node.path}/`))
    .reduce((sum, leaf) => sum + leaf.minutes, 0);
}

/** The app URL for a topic. Every link in the product is built from these two. */
export function topicHref(topicSlug: string): string {
  return `/topic/${topicSlug}`;
}

export function nodeHref(topicSlug: string, nodePath: string): string {
  return `/topic/${topicSlug}/${nodePath}`;
}

export function drillHref(topicSlug: string, nodePath: string): string {
  return `/topic/${topicSlug}/${nodePath}/drill`;
}

/**
 * Editing a topic is three separate screens under one address, because they are
 * three different questions: what the map contains, what the topic is for, and
 * how it is written. Each has its own URL so a link lands on the one being
 * talked about rather than on a hub with three buttons on it.
 */
export function editHref(topicSlug: string): string {
  return `/topic/${topicSlug}/edit`;
}

export function editMapHref(topicSlug: string): string {
  return `/topic/${topicSlug}/edit/map`;
}

export function editGoalsHref(topicSlug: string): string {
  return `/topic/${topicSlug}/edit/goals`;
}

export function editContentHref(topicSlug: string): string {
  return `/topic/${topicSlug}/edit/content`;
}
