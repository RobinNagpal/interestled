import { describe, expect, it } from "vitest";
import { TopicArchetype, flattenTwoLevelMap } from "@interestled/schemas";
import type { GeneratedMapNodeT } from "@interestled/schemas";
import { prepareNodes } from "../src/maps";

const leaf = (key: string, title: string, prerequisiteKeys: string[] = []) => ({
  key,
  title,
  claim: "c",
  minutes: 3,
  capability: "do it",
  prerequisiteKeys,
});

const section = (key: string, title: string, nodes: ReturnType<typeof leaf>[]) => ({
  key,
  title,
  claim: "c",
  capability: "do the group",
  nodes,
});

function twoLevel(sections: ReturnType<typeof section>[]): GeneratedMapNodeT[] {
  return flattenTwoLevelMap({ archetype: TopicArchetype.Tool, sections }).nodes;
}

function prepare(generated: GeneratedMapNodeT[]) {
  return prepareNodes({
    topicId: "t1",
    archetype: TopicArchetype.Tool,
    generated,
    parentId: null,
    parentPath: null,
    takenSlugs: new Set(),
    firstOrderIndex: 0,
  });
}

describe("prepareNodes", () => {
  const map = twoLevel([
    section("s1", "Getting started", [leaf("a", "Pods"), leaf("b", "Nodes")]),
    section("s2", "Networking", [leaf("c", "Services")]),
    section("s3", "Storage", [leaf("d", "Volumes")]),
  ]);

  it("builds each path from its parent's, so a URL names the whole trail", () => {
    const { rows } = prepare(map);
    expect(rows.map((row) => row.path)).toEqual([
      "getting-started",
      "getting-started/pods",
      "getting-started/nodes",
      "networking",
      "networking/services",
      "storage",
      "storage/volumes",
    ]);
  });

  it("points every child at its parent's row", () => {
    const { rows } = prepare(map);
    const parent = rows.find((row) => row.path === "getting-started")!;
    expect(rows.find((row) => row.path === "getting-started/pods")?.parentId).toBe(parent.id);
    expect(parent.parentId).toBeNull();
  });

  it("numbers position among siblings, not across the whole map", () => {
    const { rows } = prepare(map);
    // Both first children are index 0: moving one must not renumber the other level.
    expect(rows.find((row) => row.path === "getting-started/pods")?.orderIndex).toBe(0);
    expect(rows.find((row) => row.path === "networking/services")?.orderIndex).toBe(0);
    expect(rows.find((row) => row.path === "networking")?.orderIndex).toBe(1);
  });

  it("separates two identically titled siblings, which the model does produce", () => {
    const { rows } = prepare(
      twoLevel([
        section("s1", "Basics", [leaf("a", "Pods"), leaf("b", "Pods")]),
        section("s2", "More", [leaf("c", "Pods")]),
        section("s3", "Storage", [leaf("d", "Volumes")]),
      ]),
    );
    expect(rows.map((row) => row.path)).toContain("basics/pods");
    expect(rows.map((row) => row.path)).toContain("basics/pods-2");
    // Under a different parent the clean slug is free again.
    expect(rows.map((row) => row.path)).toContain("more/pods");
  });

  it("gives a title with nothing a URL can carry a slug anyway", () => {
    const { rows } = prepare(
      twoLevel([
        section("s1", "日本語", [leaf("a", "🎉"), leaf("b", "Pods")]),
        section("s2", "More", [leaf("c", "Services")]),
        section("s3", "Storage", [leaf("d", "Volumes")]),
      ]),
    );
    expect(rows.map((row) => row.path)).toContain("item");
    expect(rows.map((row) => row.path)).toContain("item/item");
  });

  it("gives a group no minutes, and every leaf its own", () => {
    const { rows } = prepare(map);
    expect(rows.find((row) => row.path === "networking")?.minutes).toBe(0);
    expect(rows.find((row) => row.path === "networking/services")?.minutes).toBe(3);
  });

  it("resolves prerequisites to ids and drops keys the model invented", () => {
    const { rows, edges } = prepare(
      twoLevel([
        section("s1", "Basics", [leaf("a", "Pods"), leaf("b", "Nodes", ["a", "nonsense", "b"])]),
        section("s2", "More", [leaf("c", "Services")]),
        section("s3", "Storage", [leaf("d", "Volumes")]),
      ]),
    );
    const pods = rows.find((row) => row.path === "basics/pods")!;
    const nodesRow = rows.find((row) => row.path === "basics/nodes")!;
    // "nonsense" names nothing, and "b" is the node itself.
    expect(edges).toEqual([{ nodeId: nodesRow.id, prerequisiteId: pods.id }]);
  });

  it("hangs a regenerated group's children under it, starting from its path", () => {
    const children = twoLevel([
      section("s1", "Taints", [leaf("a", "Tolerations")]),
      section("s2", "Affinity", [leaf("b", "Node affinity")]),
      section("s3", "Priority", [leaf("c", "Preemption")]),
    ]);
    const { rows } = prepareNodes({
      topicId: "t1",
      archetype: TopicArchetype.Tool,
      generated: children,
      parentId: "parent-row",
      parentPath: "scheduling",
      takenSlugs: new Set(),
      firstOrderIndex: 0,
    });
    expect(rows[0]).toMatchObject({ path: "scheduling/taints", parentId: "parent-row" });
    expect(rows[1]?.path).toBe("scheduling/taints/tolerations");
  });

  it("avoids slugs already used beside it, so an insert cannot collide", () => {
    const { rows } = prepareNodes({
      topicId: "t1",
      archetype: TopicArchetype.Tool,
      generated: twoLevel([
        section("s1", "Networking", [leaf("a", "Pods")]),
        section("s2", "More", [leaf("b", "Services")]),
        section("s3", "Storage", [leaf("c", "Volumes")]),
      ]),
      parentId: null,
      parentPath: null,
      takenSlugs: new Set(["networking"]),
      firstOrderIndex: 4,
    });
    expect(rows[0]).toMatchObject({ path: "networking-2", orderIndex: 4 });
  });
});
