import { describe, expect, it } from "vitest";
import { NodeStatus, TopicArchetype, VerdictLabel } from "@learnloop/schemas";
import type { LearningNodeT, VerdictT } from "@learnloop/schemas";
import { advance, afterLapse, orderVerdict, summarise } from "../src/progress";

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

describe("advance", () => {
  it("moves a seen node to explained on a passed explain-back", () => {
    expect(advance(NodeStatus.Seen, pass, false)).toBe(NodeStatus.Explained);
  });

  it("only reaches verified through an application drill", () => {
    expect(advance(NodeStatus.Explained, pass, true)).toBe(NodeStatus.Verified);
    expect(advance(NodeStatus.Explained, pass, false)).toBe(NodeStatus.Explained);
  });

  it("never demotes an earned node below shaky", () => {
    expect(advance(NodeStatus.Verified, fail, false)).toBe(NodeStatus.Shaky);
    expect(advance(NodeStatus.Untouched, fail, false)).toBe(NodeStatus.Seen);
  });

  it("keeps verified when a further explain-back passes", () => {
    expect(advance(NodeStatus.Verified, pass, false)).toBe(NodeStatus.Verified);
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
