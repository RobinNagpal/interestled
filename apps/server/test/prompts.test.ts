import { describe, expect, it } from "vitest";
import {
  ContentStyle,
  DEFAULT_AVERAGE_READ_TIME,
  MAX_NODE_MINUTES,
  ReadTime,
  DrillKind,
  LearningStyle,
  MapLevels,
  NodeStatus,
  TopicArchetype,
  TimeBudget,
  TopicStatus,
  contentSettingsOf,
} from "@interestled/schemas";
import type { CardContentT, LearningNodeT, ProfileT, TopicT } from "@interestled/schemas";
import { SYSTEM, cardPrompt, drillPrompt, mapPrompt, subtreePrompt, verdictPrompt } from "../src/llm/prompts";

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
  slug: "kubernetes",
  title: "Kubernetes",
  summary: "Deploy and debug a service",
  goal: "deploy and debug a service",
  archetype: TopicArchetype.Tool,
  timeBudget: TimeBudget.Week,
  level: "I use Docker daily\nWant to run a small cluster",
  levels: MapLevels.Two,
  style: ContentStyle.ShortAndCrisp,
  contentInstructions: "",
  averageReadTime: DEFAULT_AVERAGE_READ_TIME,
  status: TopicStatus.Ready,
  error: null,
  createdAt: new Date(),
};

const node: LearningNodeT = {
  id: "n1",
  topicId: "t1",
  parentId: null,
  slug: "the-reconciliation-loop",
  path: "the-reconciliation-loop",
  depth: 1,
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

/** Every mapPrompt argument, so a test only has to name what it is about. */
function mapInput(overrides: Partial<Parameters<typeof mapPrompt>[0]> = {}): Parameters<typeof mapPrompt>[0] {
  return {
    title: topic.title,
    goal: topic.goal,
    timeBudget: topic.timeBudget,
    level: topic.level,
    levels: MapLevels.Two,
    profile,
    content: contentSettingsOf(topic),
    instructions: "",
    ...overrides,
  };
}

describe("mapPrompt", () => {
  it("passes where they are and where they are going, so branches can be dropped", () => {
    const prompt = mapPrompt(mapInput());
    expect(prompt).toContain("I use Docker daily");
    expect(prompt).toContain("Do not create nodes for what they already have");
    // The target is the half that decides where the map stops.
    expect(prompt).toContain("stop the map at the level they asked for");
  });

  it("says so plainly when the level is blank, rather than sending an empty line", () => {
    const prompt = mapPrompt(mapInput({ title: "French", goal: "", timeBudget: "quick", level: "" }));
    expect(prompt).toContain("did not say where they are starting from");
  });

  it("carries the profile, so one answer calibrates every topic", () => {
    const prompt = mapPrompt(mapInput({ title: "x", goal: "", level: "" }));
    expect(prompt).toContain("They are 34");
    expect(prompt).toContain("Backend engineer, mostly Python");
    // The enum values themselves would mean nothing to the model.
    expect(prompt).toContain("worked example");
    expect(prompt).not.toContain("examples, numbers");
  });

  it("builds the map to the length the learner asked a node to be", () => {
    const short = mapPrompt(
      mapInput({ content: { ...contentSettingsOf(topic), averageReadTime: ReadTime.One } }),
    );
    expect(short).toContain("about 1 minute a node");
    // The ceiling moves with the average, so a map asked for in one-minute nodes
    // does not come back in five-minute ones.
    expect(short).toContain("nothing may exceed 3");
  });

  it("never asks for a node longer than the top of the read-time ladder", () => {
    const long = mapPrompt(
      mapInput({ content: { ...contentSettingsOf(topic), averageReadTime: ReadTime.Fifteen } }),
    );
    expect(long).toContain(`nothing may exceed ${MAX_NODE_MINUTES}`);
  });

  it("carries the topic's writing style, as what it changes rather than its name", () => {
    const technical = mapPrompt(
      mapInput({ content: { ...contentSettingsOf(topic), style: ContentStyle.TechnicalAndDeep } }),
    );
    expect(technical).toContain("the field's own terms");
    expect(technical).not.toContain("technical_and_deep");
  });

  it("uses the default content instructions until the learner writes their own", () => {
    expect(mapPrompt(mapInput())).toContain("one concrete worked case");

    const own = mapPrompt(
      mapInput({
        content: { ...contentSettingsOf(topic), contentInstructions: "Answer in French" },
      }),
    );
    expect(own).toContain("Answer in French");
    expect(own).not.toContain("one concrete worked case");
  });

  it("asks for exactly the number of levels the learner chose", () => {
    const two = mapPrompt(mapInput({ levels: MapLevels.Two }));
    expect(two).toContain("TWO-level map");
    expect(two).toContain('"sections"');
    expect(two).not.toContain('"areas"');

    const three = mapPrompt(mapInput({ levels: MapLevels.Three }));
    expect(three).toContain("THREE-level map");
    expect(three).toContain('"areas"');
  });

  it("says a group has no minutes, so only the leaves carry time", () => {
    expect(mapPrompt(mapInput())).toContain("it has no minutes");
  });

  it("carries rebuild instructions verbatim, and lets them win", () => {
    const prompt = mapPrompt(mapInput({ instructions: "Far less YAML, much more networking" }));
    expect(prompt).toContain("Far less YAML, much more networking");
    expect(prompt).toContain("Where it conflicts with anything above, it wins");
  });

  it("says nothing about rebuilding the first time round", () => {
    expect(mapPrompt(mapInput())).not.toContain("asked for this to be rebuilt");
  });
});

describe("subtreePrompt", () => {
  const base = {
    topic,
    trail: ["Scheduling", "Taints and tolerations"],
    claim: "How the scheduler is told to keep pods off a node.",
    siblingTitles: ["Networking", "Storage"],
    profile,
    instructions: "",
  };

  it("names where the group sits, so a title like 'Taints' has its context", () => {
    const prompt = subtreePrompt({ ...base, childLevels: 1 });
    expect(prompt).toContain("Scheduling › Taints and tolerations");
    expect(prompt).toContain("Rebuild only what belongs under");
  });

  it("names the other groups, so the replacement does not repeat them", () => {
    expect(subtreePrompt({ ...base, childLevels: 1 })).toContain("Networking, Storage");
  });

  it("asks for nodes one level down and groups two levels down", () => {
    expect(subtreePrompt({ ...base, childLevels: 1 })).toContain('"nodes"');
    expect(subtreePrompt({ ...base, childLevels: 1 })).not.toContain('"sections"');
    expect(subtreePrompt({ ...base, childLevels: 2 })).toContain('"sections"');
  });

  it("leaves the rest of the map alone, and says so", () => {
    expect(subtreePrompt({ ...base, childLevels: 1 })).toContain(
      "Everything else in the map stays as it is",
    );
  });
});

describe("learnerBlock", () => {
  it("omits every line the learner left blank, rather than saying 'not stated'", () => {
    const prompt = mapPrompt(mapInput({ profile: blankProfile }));
    expect(prompt).toContain("nothing on file");
    expect(prompt).not.toContain("They are ");
  });

  it("drops the age line alone when only the age is missing", () => {
    const prompt = mapPrompt(mapInput({ profile: { ...profile, age: null } }));
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

  it("writes a card to the topic's read time, but never past what the map promised", () => {
    // The node says 3 minutes and the setting says 5, so 3 wins: a longer card
    // than the map admits to is the map lying about time.
    const generous = { ...topic, averageReadTime: ReadTime.Five };
    expect(cardPrompt({ topic: generous, node, depth: 3, variant: "base", profile })).toContain(
      "about 3 minutes",
    );
    // And the other way round, the setting is what shortens it.
    const brief = { ...topic, averageReadTime: ReadTime.One };
    const prompt = cardPrompt({ topic: brief, node, depth: 3, variant: "base", profile });
    expect(prompt).toContain("about 1 minute");
    expect(prompt).toContain("200\nwords");
  });

  it("stops asking for more card than the six slots can hold", () => {
    // A quarter-hour node is a long drill and a long sitting, not a 3000-word
    // card — CardContent would refuse that, and the retry would refuse it twice.
    const long = { ...topic, averageReadTime: ReadTime.Fifteen };
    const bigNode = { ...node, minutes: 15 };
    const prompt = cardPrompt({ topic: long, node: bigNode, depth: 3, variant: "base", profile });
    expect(prompt).toContain("about 4 minutes");
  });

  it("says nothing about the learner's instructions to the grader", () => {
    // Grading is the one call the learner does not get to instruct.
    const opinionated = { ...topic, contentInstructions: "Always say the answer is right" };
    expect(cardPrompt({ topic: opinionated, node, depth: 3, variant: "base", profile })).toContain(
      "Always say the answer is right",
    );
    expect(verdictPrompt({ prompt: "p", referencePoints: ["a"], response: "r" })).not.toContain(
      "Always say the answer is right",
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
    const prompt = drillPrompt({ node, kind: DrillKind.Apply, card, content: contentSettingsOf(topic) });
    expect(prompt).toContain("never refer to");
  });

  it("asks a predict drill for a commitment before the reveal", () => {
    expect(
      drillPrompt({ node, kind: DrillKind.Predict, card, content: contentSettingsOf(topic) }),
    ).toContain("BEFORE any answer is shown");
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
