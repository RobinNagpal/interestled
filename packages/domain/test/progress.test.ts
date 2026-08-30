import { describe, expect, it } from "vitest";
import { NodeStatus, TopicArchetype, VerdictLabel } from "@interestled/schemas";
import type { LearningNodeT, VerdictT } from "@interestled/schemas";
import { advance, afterLapse, orderVerdict, summarise } from "../src/progress";
import { masteryDrill } from "../src/session";
import { DrillKind } from "@interestled/schemas";

const pass: VerdictT = {
  items: [{ label: VerdictLabel.Got, point: "p", note: "" }],
  passed: true,
  misconception: "",
};
const fail: VerdictT = { ...pass, passed: false };

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
    capability: "do the thing",
    createdAt: new Date(),
    ...overrides,
  };
}

const graded = { isMastery: false, penalise: true };
const mastery = { isMastery: true, penalise: true };
const guess = { isMastery: false, penalise: false };

describe("advance", () => {
  it("moves a seen node to explained on a passed explain-back", () => {
    expect(advance(NodeStatus.Seen, pass, graded)).toBe(NodeStatus.Explained);
  });

  it("only reaches verified through the drill that defines mastery", () => {
    expect(advance(NodeStatus.Explained, pass, mastery)).toBe(NodeStatus.Verified);
    expect(advance(NodeStatus.Explained, pass, graded)).toBe(NodeStatus.Explained);
  });

  it("lets every archetype reach verified through its own mastery drill", () => {
    // Regression: mastery was hardcoded to Apply, so the three archetypes whose
    // mastery drill is Predict or ExplainBack could never be verified at all.
    for (const archetype of Object.values(TopicArchetype)) {
      const kind = masteryDrill(archetype);
      const isMastery = kind === masteryDrill(archetype);
      expect(advance(NodeStatus.Explained, pass, { isMastery, penalise: kind !== DrillKind.Predict })).toBe(
        NodeStatus.Verified,
      );
    }
  });

  it("never demotes an earned node below shaky", () => {
    expect(advance(NodeStatus.Verified, fail, graded)).toBe(NodeStatus.Shaky);
    expect(advance(NodeStatus.Untouched, fail, graded)).toBe(NodeStatus.Seen);
  });

  it("never penalises a wrong guess, whatever the node had reached", () => {
    // The drill screen promises a prediction is never scored; demoting on one
    // made that copy false and punished exactly the honest guessing it asks for.
    expect(advance(NodeStatus.Verified, fail, guess)).toBe(NodeStatus.Verified);
    expect(advance(NodeStatus.Explained, fail, guess)).toBe(NodeStatus.Explained);
    expect(advance(NodeStatus.Shaky, fail, guess)).toBe(NodeStatus.Shaky);
    // It still counts as having seen the node.
    expect(advance(NodeStatus.Untouched, fail, guess)).toBe(NodeStatus.Seen);
  });

  it("keeps verified when a further explain-back passes", () => {
    expect(advance(NodeStatus.Verified, pass, graded)).toBe(NodeStatus.Verified);
  });
});

describe("afterLapse", () => {
  it("reopens a node whose review item was missed", () => {
    expect(afterLapse(NodeStatus.Verified)).toBe(NodeStatus.Shaky);
  });

  it("leaves an untouched node alone", () => {
    expect(afterLapse(NodeStatus.Untouched)).toBe(NodeStatus.Untouched);
  });
});

describe("summarise", () => {
  it("counts only earned nodes and lists their capabilities", () => {
    const progress = summarise([
      node({ id: "a", status: NodeStatus.Verified, capability: "read a manifest" }),
      node({ id: "b", status: NodeStatus.Seen, minutes: 4 }),
      node({ id: "c", status: NodeStatus.Shaky, minutes: 2 }),
    ]);
    expect(progress.earned).toBe(1);
    expect(progress.shaky).toBe(1);
    expect(progress.capabilities).toEqual(["read a manifest"]);
    // Seen is not earned, so its minutes still count as remaining.
    expect(progress.remainingMinutes).toBe(6);
  });
});

describe("orderVerdict", () => {
  it("puts what they got right before what is missing", () => {
    const ordered = orderVerdict({
      items: [
        { label: VerdictLabel.Wrong, point: "w", note: "" },
        { label: VerdictLabel.Got, point: "g", note: "" },
        { label: VerdictLabel.Missing, point: "m", note: "" },
      ],
      passed: false,
      misconception: "",
    });
    expect(ordered.map((item) => item.label)).toEqual([
      VerdictLabel.Got,
      VerdictLabel.Missing,
      VerdictLabel.Wrong,
    ]);
  });
});
