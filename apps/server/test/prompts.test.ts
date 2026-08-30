import { describe, expect, it } from "vitest";
import { DrillKind, NodeStatus, TopicArchetype, TimeBudget, TopicStatus } from "@interestled/schemas";
import type { CardContentT, LearningNodeT, TopicT } from "@interestled/schemas";
import { SYSTEM, cardPrompt, drillPrompt, mapPrompt, verdictPrompt } from "../src/llm/prompts";

const topic: TopicT = {
  id: "t1",
  userId: "u1",
  title: "Kubernetes",
  goal: "deploy and debug a service",
  archetype: TopicArchetype.Tool,
  timeBudget: TimeBudget.Week,
  knownDomains: ["docker", "linux"],
  status: TopicStatus.Ready,
  error: null,
  createdAt: new Date(),
};

const node: LearningNodeT = {
  id: "n1",
  topicId: "t1",
  title: "The reconciliation loop",
  claim: "Something compares desired state to actual state, forever.",
  minutes: 3,
  archetype: TopicArchetype.Tool,
  orderIndex: 0,
  status: NodeStatus.Seen,
  prerequisiteIds: [],
  capability: "Say which controller is acting and what it wants",
  createdAt: new Date(),
};

const card: CardContentT = {
  claim: "A controller loops forever comparing what you asked for to what exists.",
  mechanism: ["The API server holds desired state."],
  example: { setup: "3 replicas, one node dies", result: "a new pod appears in 4s" },
  misconception: { belief: "kubectl creates the pod", correction: "the controller does" },
  jargon: [],
};

describe("SYSTEM", () => {
  it("bans the failure modes the design documents call out", () => {
    // A5 preambles, A20 effort framing, and inventing facts.
    expect(SYSTEM).toContain("No preamble");
    expect(SYSTEM).toContain("Never invent");
    expect(SYSTEM).toContain("effort language");
    expect(SYSTEM).toContain("JSON only");
  });
});

describe("mapPrompt", () => {
  it("passes what they already know, so whole branches can be dropped", () => {
    const prompt = mapPrompt({
      title: topic.title,
      goal: topic.goal,
      timeBudget: topic.timeBudget,
      knownDomains: topic.knownDomains,
    });
    expect(prompt).toContain("docker, linux");
    expect(prompt).toContain("Do not create nodes for things these already cover");
  });

  it("says so plainly when nothing is known, rather than sending an empty list", () => {
    const prompt = mapPrompt({ title: "French", goal: "", timeBudget: "quick", knownDomains: [] });
    expect(prompt).toContain("did not name anything");
  });

  it("caps node minutes so nothing on the map looks unfinishable", () => {
    expect(mapPrompt({ title: "x", goal: "", timeBudget: "week", knownDomains: [] })).toContain(
      "Nothing may exceed 5",
    );
  });
});

describe("cardPrompt", () => {
  it("changes the instruction with the depth", () => {
    const shallow = cardPrompt({ topic, node, depth: 1, variant: "base" });
    const deep = cardPrompt({ topic, node, depth: 5, variant: "base" });
    expect(shallow).toContain("intuition only");
    expect(deep).toContain("expert");
  });

  it("asks a variant for a different angle at the same depth", () => {
    expect(cardPrompt({ topic, node, depth: 3, variant: "where_this_breaks" })).toContain(
      "when this model is wrong",
    );
  });
});

describe("drillPrompt", () => {
  it("requires the prompt to stand alone, with no reference to a previous screen", () => {
    const prompt = drillPrompt({ node, kind: DrillKind.Apply, card });
    expect(prompt).toContain("never refer to");
  });

  it("asks a predict drill for a commitment before the reveal", () => {
    expect(drillPrompt({ node, kind: DrillKind.Predict, card })).toContain("BEFORE any answer is shown");
  });
});

describe("verdictPrompt", () => {
  it("forbids scoring and demands the answer be judged, not the person", () => {
    const prompt = verdictPrompt({ prompt: "p", referencePoints: ["a", "b"], response: "r" });
    expect(prompt).toContain("never the person");
    expect(prompt).toContain("No score");
  });

  it("numbers the reference points so each is judged separately", () => {
    expect(verdictPrompt({ prompt: "p", referencePoints: ["first", "second"], response: "r" })).toContain(
      "2. second",
    );
  });
});
