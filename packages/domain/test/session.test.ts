import { describe, expect, it } from "vitest";
import { DrillKind, NodeStatus, TopicArchetype } from "@learnloop/schemas";
import type { LearningNodeT } from "@learnloop/schemas";
import { StepKind, composeSession, contractLine, masteryDrill, missingPrerequisites, nextNode } from "../src/session";

function node(overrides: Partial<LearningNodeT> = {}): LearningNodeT {
  return {
    id: "n1",
    topicId: "t1",
    title: "Node",
    claim: "A claim",
    minutes: 3,
    archetype: TopicArchetype.Tool,
    orderIndex: 0,
    status: NodeStatus.Untouched,
    prerequisiteIds: [],
    capability: "Do the thing",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("masteryDrill", () => {
  it("decides what known means per archetype", () => {
    expect(masteryDrill(TopicArchetype.System)).toBe(DrillKind.Predict);
    expect(masteryDrill(TopicArchetype.Tool)).toBe(DrillKind.Apply);
    expect(masteryDrill(TopicArchetype.Story)).toBe(DrillKind.ExplainBack);
  });
});

describe("nextNode", () => {
  it("puts a shaky node ahead of new material", () => {
    const nodes = [
      node({ id: "a", orderIndex: 0 }),
      node({ id: "b", orderIndex: 5, status: NodeStatus.Shaky }),
    ];
    expect(nextNode(nodes)?.id).toBe("b");
  });

  it("returns null once everything is earned", () => {
    expect(nextNode([node({ status: NodeStatus.Verified })])).toBeNull();
  });
});

describe("missingPrerequisites", () => {
  it("lists only prerequisites that are not yet earned", () => {
    const done = node({ id: "p1", status: NodeStatus.Verified });
    const undone = node({ id: "p2" });
    const target = node({ id: "n2", prerequisiteIds: ["p1", "p2"] });
    expect(missingPrerequisites(target, [done, undone, target]).map((n) => n.id)).toEqual(["p2"]);
  });
});

describe("composeSession", () => {
  const nodes = [
    node({ id: "a", orderIndex: 0, minutes: 3 }),
    node({ id: "b", orderIndex: 1, minutes: 3 }),
  ];

  it("never places three screens of the same shape in a row", () => {
    const steps = composeSession(nodes, 60, false);
    for (let index = 2; index < steps.length; index += 1) {
      const run = [steps[index - 2]?.kind, steps[index - 1]?.kind, steps[index]?.kind];
      expect(new Set(run).size).toBeGreaterThan(1);
    }
  });

  it("stays inside the minute budget", () => {
    const steps = composeSession(nodes, 6, false);
    expect(steps.reduce((sum, step) => sum + step.minutes, 0)).toBeLessThanOrEqual(6);
  });

  it("leads with review when something is due", () => {
    expect(composeSession(nodes, 30, true)[0]?.kind).toBe(StepKind.Review);
  });

  it("skips nodes that are already earned", () => {
    const steps = composeSession([node({ id: "a", status: NodeStatus.Verified })], 30, false);
    expect(steps).toEqual([]);
  });
});

describe("contractLine", () => {
  it("states minutes, node count and the capability gained", () => {
    const steps = composeSession([node({ id: "a", capability: "Read a manifest" })], 30, false);
    expect(contractLine(steps, [node({ id: "a", capability: "Read a manifest" })])).toContain(
      "read a manifest",
    );
  });

  it("describes a review-only session without inventing a capability", () => {
    expect(contractLine([{ kind: StepKind.Review, nodeId: "", minutes: 2 }], [])).toBe(
      "2 minutes of review.",
    );
  });
});
