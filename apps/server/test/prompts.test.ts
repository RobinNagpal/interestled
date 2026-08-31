import { describe, expect, it } from "vitest";
import {
  DrillKind,
  LearningStyle,
  NodeStatus,
  TopicArchetype,
  TimeBudget,
  TopicStatus,
} from "@interestled/schemas";
import type { CardContentT, LearningNodeT, ProfileT, TopicT } from "@interestled/schemas";
import { SYSTEM, cardPrompt, drillPrompt, mapPrompt, verdictPrompt } from "../src/llm/prompts";

const profile: ProfileT = {
  age: 34,
  background: "Backend engineer, mostly Python",
  learningStyles: [LearningStyle.Examples, LearningStyle.Numbers],
};

/** A learner who has filled in nothing — the state every account starts in. */
const blankProfile: ProfileT = { age: null, background: "", learningStyles: [] };

const topic: TopicT = {
  id: "t1",
  userId: "u1",
  title: "Kubernetes",
  goal: "deploy and debug a service",
  archetype: TopicArchetype.Tool,
  timeBudget: TimeBudget.Week,
  level: "I use Docker daily\nWant to run a small cluster",
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
  it("passes where they are and where they are going, so branches can be dropped", () => {
    const prompt = mapPrompt({
      title: topic.title,
      goal: topic.goal,
      timeBudget: topic.timeBudget,
      level: topic.level,
      profile,
    });
    expect(prompt).toContain("I use Docker daily");
    expect(prompt).toContain("Do not create nodes for what they already have");
    // The target is the half that decides where the map stops.
    expect(prompt).toContain("stop the map at the level they asked for");
  });

  it("says so plainly when the level is blank, rather than sending an empty line", () => {
    const prompt = mapPrompt({
      title: "French",
      goal: "",
      timeBudget: "quick",
      level: "",
      profile,
    });
    expect(prompt).toContain("did not say where they are starting from");
  });

  it("carries the profile, so one answer calibrates every topic", () => {
    const prompt = mapPrompt({
      title: "x",
      goal: "",
      timeBudget: "week",
      level: "",
      profile,
    });
    expect(prompt).toContain("They are 34");
    expect(prompt).toContain("Backend engineer, mostly Python");
    // The enum values themselves would mean nothing to the model.
    expect(prompt).toContain("worked example");
    expect(prompt).not.toContain("examples, numbers");
  });

  it("caps node minutes so nothing on the map looks unfinishable", () => {
    expect(
      mapPrompt({ title: "x", goal: "", timeBudget: "week", level: "", profile: blankProfile }),
    ).toContain("Nothing may exceed 5");
  });
});

describe("learnerBlock", () => {
  it("omits every line the learner left blank, rather than saying 'not stated'", () => {
    const prompt = mapPrompt({
      title: "x",
      goal: "",
      timeBudget: "week",
      level: "",
      profile: blankProfile,
    });
    expect(prompt).toContain("nothing on file");
    expect(prompt).not.toContain("They are ");
  });

  it("drops the age line alone when only the age is missing", () => {
    const prompt = mapPrompt({
      title: "x",
      goal: "",
      timeBudget: "week",
      level: "",
      profile: { ...profile, age: null },
    });
    expect(prompt).not.toContain("They are ");
    expect(prompt).toContain("Backend engineer, mostly Python");
  });
});

describe("cardPrompt", () => {
  it("changes the instruction with the depth", () => {
    const shallow = cardPrompt({ topic, node, depth: 1, variant: "base", profile });
    const deep = cardPrompt({ topic, node, depth: 5, variant: "base", profile });
    expect(shallow).toContain("intuition only");
    expect(deep).toContain("expert");
  });

  it("asks a variant for a different angle at the same depth", () => {
    expect(cardPrompt({ topic, node, depth: 3, variant: "where_this_breaks", profile })).toContain(
      "when this model is wrong",
    );
  });

  it("writes the card to the same profile the map was built from", () => {
    const prompt = cardPrompt({ topic, node, depth: 3, variant: "base", profile });
    expect(prompt).toContain("Backend engineer, mostly Python");
    expect(prompt).toContain("real quantities");
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
