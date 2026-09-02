import { describe, expect, it } from "vitest";
import { NodeStatus, TopicArchetype } from "@interestled/schemas";
import type { LearningNodeT } from "@interestled/schemas";
import {
  ancestorsOf,
  buildTree,
  descendantsOf,
  drillHref,
  editHref,
  inMapOrder,
  isBranch,
  leafNodes,
  nodeByPath,
  nodeHref,
  rollupMinutes,
  topicHref,
} from "../src/tree";
import { summarise } from "../src/progress";
import { nextNode } from "../src/session";

/** A group: no minutes of its own, and something hanging off it. */
function group(path: string, orderIndex: number, parentId: string | null = null): LearningNodeT {
  return node({ path, orderIndex, parentId, minutes: 0 });
}

function node(overrides: Partial<LearningNodeT> & { path: string }): LearningNodeT {
  const segments = overrides.path.split("/");
  return {
    id: overrides.path,
    topicId: "t1",
    parentId: null,
    slug: segments[segments.length - 1]!,
    depth: segments.length,
    title: overrides.path,
    claim: "A claim",
    minutes: 3,
    archetype: TopicArchetype.Tool,
    orderIndex: 0,
    status: NodeStatus.Untouched,
    prerequisiteIds: [],
    capability: "Do the thing",
    cardInstructions: "",
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Two groups, two leaves each. Written out of order on purpose: nothing may
 * depend on the array happening to arrive sorted.
 */
const map: LearningNodeT[] = [
  node({ path: "basics/pods", parentId: "basics", orderIndex: 1, minutes: 2 }),
  group("basics", 0),
  node({ path: "basics/nodes", parentId: "basics", orderIndex: 0, minutes: 4 }),
  group("networking", 1),
  node({ path: "networking/services", parentId: "networking", orderIndex: 0, minutes: 5 }),
];

describe("buildTree", () => {
  it("nests children under their parent, each level in its own order", () => {
    const tree = buildTree(map);
    expect(tree.map((entry) => entry.node.path)).toEqual(["basics", "networking"]);
    expect(tree[0]!.children.map((entry) => entry.node.path)).toEqual([
      "basics/nodes",
      "basics/pods",
    ]);
  });

  it("shows an orphan at the top rather than dropping it off the map", () => {
    const orphan = node({ path: "lost", parentId: "gone", orderIndex: 9 });
    expect(buildTree([...map, orphan]).some((entry) => entry.node.path === "lost")).toBe(true);
  });
});

describe("inMapOrder", () => {
  it("reads down the tree, each node followed by what is under it", () => {
    expect(inMapOrder(map).map((entry) => entry.path)).toEqual([
      "basics",
      "basics/nodes",
      "basics/pods",
      "networking",
      "networking/services",
    ]);
  });

  it("follows a move, because order is per level and not per path", () => {
    // Swapping the two groups' orderIndex is exactly what the edit screen does.
    const moved = map.map((entry) =>
      entry.path === "basics"
        ? { ...entry, orderIndex: 1 }
        : entry.path === "networking"
          ? { ...entry, orderIndex: 0 }
          : entry,
    );
    expect(inMapOrder(moved).map((entry) => entry.path)[0]).toBe("networking");
  });
});

describe("leaves and branches", () => {
  it("counts only what a learner can actually do", () => {
    expect(leafNodes(map).map((entry) => entry.path)).toEqual([
      "basics/pods",
      "basics/nodes",
      "networking/services",
    ]);
  });

  it("is a branch exactly when something hangs off it", () => {
    expect(isBranch(map[1]!, map)).toBe(true);
    expect(isBranch(map[0]!, map)).toBe(false);
  });

  it("makes a group a leaf again once its last child is deleted", () => {
    // Deleting is an edit, so this is a state the map really reaches.
    const emptied = map.filter((entry) => !entry.path.startsWith("networking/"));
    expect(isBranch(emptied.find((entry) => entry.path === "networking")!, emptied)).toBe(false);
  });
});

describe("summarise", () => {
  it("totals the leaves, not the headings", () => {
    // Five rows on screen, three of them things anyone can complete. Counting
    // the groups would give a total the learner can never reach.
    expect(summarise(map).total).toBe(3);
    expect(summarise(map).remainingMinutes).toBe(11);
  });
});

describe("nextNode", () => {
  it("offers a leaf, in map order, never a heading", () => {
    expect(nextNode(map)?.path).toBe("basics/nodes");
  });
});

describe("rollupMinutes", () => {
  it("adds up the leaves under a group, so a collapsed row still states its cost", () => {
    expect(rollupMinutes(map[1]!, map)).toBe(6);
  });

  it("is a leaf's own estimate when there is nothing under it", () => {
    expect(rollupMinutes(map[0]!, map)).toBe(2);
  });
});

describe("ancestors, descendants and lookup", () => {
  it("walks the chain a path encodes", () => {
    const pods = map[0]!;
    expect(ancestorsOf(pods, map).map((entry) => entry.path)).toEqual(["basics"]);
    expect(descendantsOf(map[1]!, map).map((entry) => entry.path).sort()).toEqual([
      "basics/nodes",
      "basics/pods",
    ]);
  });

  it("finds a node by the path a URL carries, and nothing by a path that is gone", () => {
    expect(nodeByPath(map, "basics/pods")?.title).toBe("basics/pods");
    expect(nodeByPath(map, "basics/gone")).toBeNull();
  });
});

describe("hrefs", () => {
  it("builds every address in the product from slugs", () => {
    expect(topicHref("kubernetes")).toBe("/topic/kubernetes");
    expect(editHref("kubernetes")).toBe("/topic/kubernetes/edit");
    expect(nodeHref("kubernetes", "basics/pods")).toBe("/topic/kubernetes/basics/pods");
    expect(drillHref("kubernetes", "basics/pods")).toBe("/topic/kubernetes/basics/pods/drill");
  });
});
