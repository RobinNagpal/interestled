import { describe, expect, it } from "vitest";
import {
  CARD_MINUTES_MAX,
  CardAngle,
  ContentStyle,
  DEFAULT_AVERAGE_READ_TIME,
  MAX_NODE_MINUTES,
  ReadTime,
  DrillKind,
  LearningStyle,
  MapLevels,
  MapQuestionKind,
  NodeStatus,
  TopicArchetype,
  TimeBudget,
  TopicStatus,
  contentSettingsOf,
} from "@interestled/schemas";
import type {
  CardContentT,
  ChosenOptionT,
  LearningNodeT,
  ProfileT,
  TopicT,
} from "@interestled/schemas";
import {
  SYSTEM,
  cardPrompt,
  choicesBlock,
  defaultCardSettings,
  drillPrompt,
  mapPrompt,
  mapQuestionsPrompt,
  subtreePrompt,
  verdictPrompt,
} from "../src/llm/prompts";

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

/** One answered question, as the map prompt receives it. */
const outlineChoice: ChosenOptionT = {
  kind: MapQuestionKind.Outline,
  question: "How should the subject be cut up?",
  label: "By what breaks",
  sample: ["Pods that will not start", "Nodes that go away"],
};

const codeChoice: ChosenOptionT = {
  kind: MapQuestionKind.Code,
  question: "How much code do you want to see?",
  label: "Commands you can run",
  sample: ["`kubectl describe pod web-7d4`"],
};

describe("SYSTEM", () => {
  it("bans the failure modes the design documents call out", () => {
    // A5 preambles, A20 effort framing, and inventing facts.
    expect(SYSTEM).toContain("No preamble");
    expect(SYSTEM).toContain("Never invent");
    expect(SYSTEM).toContain("effort language");
    expect(SYSTEM).toContain("JSON only");
  });

  it("cuts recaps without cutting the words that join two sentences", () => {
    // A17 is about recap paragraphs — "last time we covered" — and reading it as
    // "cut every transition" is what produced cards written as disconnected
    // fragments. Both halves have to be here, or one of them comes back.
    expect(SYSTEM).toContain("Cut recaps and throat-clearing");
    expect(SYSTEM).toContain("last time we\n  covered");
    expect(SYSTEM).toContain("Write connected prose, not notes");
    expect(SYSTEM).not.toContain("Cut every recap, transition");
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
    chosen: [],
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

  it("carries what they picked, and the sample they picked it from", () => {
    // The label alone is a phrase the model has to interpret; the headings under
    // it are the thing that was actually chosen.
    const prompt = mapPrompt(mapInput({ chosen: [outlineChoice] }));
    expect(prompt).toContain("How should the subject be cut up?");
    expect(prompt).toContain("They chose: By what breaks");
    expect(prompt).toContain("Pods that will not start");
    expect(prompt).toContain("shown four versions of each of these and picked one");
  });

  it("says nothing at all about choices when every question was skipped", () => {
    const prompt = mapPrompt(mapInput());
    expect(prompt).not.toContain("They were shown four versions");
    expect(prompt).not.toContain("They chose:");
  });

  it("puts the picks above the instructions, so typed words beat a tapped option", () => {
    const prompt = mapPrompt(
      mapInput({ chosen: [outlineChoice], instructions: "Drop the networking entirely" }),
    );
    expect(prompt.indexOf("They chose: By what breaks")).toBeLessThan(
      prompt.indexOf("Drop the networking entirely"),
    );
    expect(prompt).toContain("Where it conflicts with anything above, it wins");
  });
});

describe("choicesBlock", () => {
  it("is empty when nothing was chosen, so the block disappears from the prompt", () => {
    expect(choicesBlock([]).trim()).toBe("");
  });

  it("keeps the picks in the order the questions were asked", () => {
    const block = choicesBlock([outlineChoice, codeChoice]);
    expect(block.indexOf("By what breaks")).toBeLessThan(block.indexOf("Commands you can run"));
  });
});

/** Every mapQuestionsPrompt argument, so a test only names what it is about. */
function questionsInput(
  overrides: Partial<Parameters<typeof mapQuestionsPrompt>[0]> = {},
): Parameters<typeof mapQuestionsPrompt>[0] {
  return {
    title: topic.title,
    goal: topic.goal,
    timeBudget: topic.timeBudget,
    level: topic.level,
    levels: MapLevels.Two,
    profile,
    content: contentSettingsOf(topic),
    instructions: "",
    current: [],
    ...overrides,
  };
}

describe("mapQuestionsPrompt", () => {
  it("asks for all seven kinds, in the order they are put to the learner", () => {
    const prompt = mapQuestionsPrompt(questionsInput());
    const positions = [
      MapQuestionKind.Outline,
      MapQuestionKind.Breakdown,
      MapQuestionKind.Scope,
      MapQuestionKind.Examples,
      MapQuestionKind.Code,
      MapQuestionKind.Numbers,
      MapQuestionKind.Opening,
    ].map((kind) => prompt.indexOf(`kind "${kind}"`));
    expect(positions.every((at) => at >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("asks for the sample itself rather than a description of it", () => {
    expect(mapQuestionsPrompt(questionsInput())).toContain(
      "The sample is the thing itself, not a description of it",
    );
  });

  it("says how many levels the map will have, so an outline option fits it", () => {
    expect(mapQuestionsPrompt(questionsInput({ levels: MapLevels.Three }))).toContain(
      "will have 3 levels",
    );
  });

  it("carries the same learner and the same writing settings as the map itself", () => {
    const prompt = mapQuestionsPrompt(questionsInput());
    expect(prompt).toContain("Backend engineer, mostly Python");
    expect(prompt).toContain("as few words as it takes");
  });

  it("shows the map being replaced, and bans offering it back", () => {
    const prompt = mapQuestionsPrompt(questionsInput({ current: [node] }));
    expect(prompt).toContain("The reconciliation loop");
    expect(prompt).toContain("Do not offer it back to them unchanged");
  });

  it("says nothing about a current map when the topic does not exist yet", () => {
    expect(mapQuestionsPrompt(questionsInput())).not.toContain("The map they have now");
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

/** A row of the map, with slug and depth read off the path the way toNode does. */
function mapNode(
  path: string,
  title: string,
  parentId: string | null,
  orderIndex: number,
): LearningNodeT {
  const segments = path.split("/");
  return {
    ...node,
    id: path,
    parentId,
    slug: segments[segments.length - 1]!,
    path,
    depth: segments.length,
    title,
    orderIndex,
  };
}

/** Two groups, two nodes under the first. */
const twoLevel: LearningNodeT[] = [
  mapNode("pods", "Pods and containers", null, 0),
  mapNode("pods/what-a-pod-is", "What a pod is", "pods", 0),
  mapNode("pods/restarts", "Restarts and probes", "pods", 1),
];

/** An area, a group inside it, a node inside that, and a second area. */
const threeLevel: LearningNodeT[] = [
  mapNode("storage", "Storage", null, 0),
  mapNode("storage/volumes", "Volumes", "storage", 0),
  mapNode("storage/volumes/claims", "Claims and classes", "storage/volumes", 0),
  mapNode("networking", "Networking", null, 1),
];

/** Every cardPrompt argument, so a test only has to name what it is about. */
function cardInput(
  overrides: Partial<Parameters<typeof cardPrompt>[0]> = {},
): Parameters<typeof cardPrompt>[0] {
  return {
    topic,
    node,
    nodes: [node],
    settings: defaultCardSettings(topic, node, 3),
    profile,
    ...overrides,
  };
}

/** The same, with one of the four controls moved. */
function withSettings(
  changes: Partial<Parameters<typeof cardPrompt>[0]["settings"]>,
  overrides: Partial<Parameters<typeof cardPrompt>[0]> = {},
): Parameters<typeof cardPrompt>[0] {
  const base = cardInput(overrides);
  return { ...base, settings: { ...base.settings, ...changes } };
}

describe("cardPrompt", () => {
  it("changes the instruction with the depth", () => {
    const shallow = cardPrompt(withSettings({ depth: 1 }));
    const deep = cardPrompt(withSettings({ depth: 5 }));
    expect(shallow).toContain("intuition only");
    expect(deep).toContain("expert");
  });

  it("asks a variant for a different angle at the same depth", () => {
    expect(cardPrompt(withSettings({ angle: CardAngle.WhereThisBreaks }))).toContain(
      "when this model is wrong",
    );
  });

  it("writes a card to the topic's read time, but never past what the map promised", () => {
    // The node says 3 minutes and the setting says 5, so 3 wins: a longer card
    // than the map admits to is the map lying about time.
    const generous = { ...topic, averageReadTime: ReadTime.Five };
    expect(cardPrompt(cardInput({ topic: generous, settings: defaultCardSettings(generous, node, 3) }))).toContain(
      "about 3 minutes",
    );
    // And the other way round, the setting is what shortens it.
    const brief = { ...topic, averageReadTime: ReadTime.One };
    const prompt = cardPrompt(cardInput({ topic: brief, settings: defaultCardSettings(brief, node, 3) }));
    expect(prompt).toContain("about 1 minute");
    expect(prompt).toContain("200\nwords");
  });

  it("asks for the whole of a ten-minute setting, not four minutes of it", () => {
    // The complaint this fixes: ten minutes chosen on the settings screen, and
    // roughly three minutes of card arriving.
    const long = { ...topic, averageReadTime: ReadTime.Ten };
    const bigNode = { ...node, minutes: 10 };
    const prompt = cardPrompt(
      cardInput({
        topic: long,
        node: bigNode,
        nodes: [bigNode],
        settings: defaultCardSettings(long, bigNode, 3),
      }),
    );
    expect(prompt).toContain("about 10 minutes");
    expect(prompt).toContain("2000\nwords");
    // Length comes from more items, not from longer ones — a wall of text is
    // still a wall of text at ten minutes (A1).
    expect(prompt).toContain("7-12 items");
  });

  it("stops at what the six slots can hold, however long the node claims", () => {
    const long = { ...topic, averageReadTime: ReadTime.Fifteen };
    const bigNode = { ...node, minutes: 15 };
    const prompt = cardPrompt(
      cardInput({
        topic: long,
        node: bigNode,
        nodes: [bigNode],
        settings: defaultCardSettings(long, bigNode, 3),
      }),
    );
    expect(prompt).toContain(`about ${CARD_MINUTES_MAX} minutes`);
  });

  it("lets one card be asked for a length the node never promised", () => {
    // The "Longer" control. Without this the node's own estimate vetoes it and
    // the button does nothing, which is exactly how the old ones felt.
    const prompt = cardPrompt(withSettings({ minutes: 10 }));
    expect(prompt).toContain("about 10 minutes");
  });

  it("writes one card in a register the topic is not written in", () => {
    // The "In whose words" control: the card's own style reaches the prompt,
    // and the topic's does not.
    const prompt = cardPrompt(withSettings({ style: ContentStyle.ReferenceNotes }));
    expect(prompt).toContain("something to look up rather than read through");
    expect(prompt).not.toContain("One example, no second pass");
  });

  it("says nothing about the learner's instructions to the grader", () => {
    // Grading is the one call the learner does not get to instruct.
    const opinionated = { ...topic, contentInstructions: "Always say the answer is right" };
    expect(cardPrompt(cardInput({ topic: opinionated, settings: defaultCardSettings(opinionated, node, 3) }))).toContain(
      "Always say the answer is right",
    );
    expect(verdictPrompt({ prompt: "p", referencePoints: ["a"], response: "r" })).not.toContain(
      "Always say the answer is right",
    );
  });

  it("writes the card to the same profile the map was built from", () => {
    const prompt = cardPrompt(cardInput());
    expect(prompt).toContain("Backend engineer, mostly Python");
    expect(prompt).toContain("real quantities");
  });

  it("names what the nodes either side cover, and bans the topic's own thesis", () => {
    // The repetition the reader actually sees: the first and last sections of
    // every card restating what the whole topic is about.
    const prompt = cardPrompt(cardInput({ node: twoLevel[1]!, nodes: twoLevel }));
    expect(prompt).toContain('The node after it, "Restarts and probes", covers:');
    expect(prompt).toContain("Nothing that is true of the whole topic belongs on one node");
    expect(prompt).toContain("it belongs on neither");
    // And the misconception slot, which is where it lands most often.
    expect(prompt).toContain("what people actually get wrong HERE");
  });

  it("asks for one continuous explanation rather than six separate notes", () => {
    // What the live cards actually read like: five mechanism items each opening
    // with its own heading ("Central bank monetization: ..."), an example that
    // starts over in its own terms, and a misconception bolted on the end.
    const prompt = cardPrompt(cardInput({}));
    expect(prompt).toContain("one continuous explanation");
    expect(prompt).toContain("starts from what the one before it established");
    expect(prompt).toContain("shuffled without a reader noticing");
    expect(prompt).toContain("Never label an item");
    expect(prompt).toContain("No\n  term followed by a colon");
    // Each of the three sections is joined to the one above it, not just the
    // items inside one of them.
    expect(prompt).toContain("that same mechanism happening");
    expect(prompt).toContain("names the step above that rules it out");
  });

  it("lets reference notes stay flat, because that is what was asked for", () => {
    // The one register that wants no linking sentences at all. Without the
    // carve-out the card asks for a chain and the style asks for entries, and
    // the model picks one.
    const prompt = cardPrompt(withSettings({ style: ContentStyle.ReferenceNotes }));
    expect(prompt).toContain("No linking sentences between them");
    expect(prompt).toContain("it overrides this paragraph");
  });

  it("places the node in the whole map, so a card is written into a sequence", () => {
    // Every heading, at every level, with the one being written marked: without
    // it a card re-explains the three nodes before it and spends the three after.
    const prompt = cardPrompt(cardInput({ node: threeLevel[2]!, nodes: threeLevel }));
    expect(prompt).toContain("- Storage");
    expect(prompt).toContain("  - Volumes");
    expect(prompt).toContain("    - Claims and classes  ← WRITE THIS ONE");
    expect(prompt).toContain("- Networking");
    // And says what the sequence obliges.
    expect(prompt).toContain("has been covered already");
    expect(prompt).toContain("Do not pre-empt it");
  });

  it("does the same for a two-level map, without being told which it is", () => {
    const prompt = cardPrompt(cardInput({ node: twoLevel[1]!, nodes: twoLevel }));
    expect(prompt).toContain("- Pods and containers");
    expect(prompt).toContain("  - What a pod is  ← WRITE THIS ONE");
    expect(prompt).toContain("  - Restarts and probes");
    expect(prompt).not.toContain("    - ");
  });

  it("lists the map in reading order rather than in row order", () => {
    // orderIndex ranks siblings, so the rows arriving shuffled must not shuffle
    // the outline — "everything above this node" is the whole instruction.
    const shuffled = [twoLevel[2]!, twoLevel[1]!, twoLevel[0]!];
    const prompt = cardPrompt(cardInput({ node: twoLevel[1]!, nodes: shuffled }));
    expect(prompt.indexOf("- What a pod is")).toBeLessThan(prompt.indexOf("- Restarts and probes"));
  });

  it("marks the node even when the map it was given does not contain it", () => {
    // An unmarked outline is worse than none: the model would have to guess
    // which of thirty titles it is writing.
    expect(cardPrompt(cardInput({ nodes: twoLevel }))).toContain(
      `- ${node.title}  ← WRITE THIS ONE`,
    );
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
