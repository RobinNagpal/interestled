import { describe, expect, it } from "vitest";
import {
  CARD_MINUTES_MAX,
  CardAngle,
  ContentFormat,
  EnglishLevel,
  DEFAULT_AVERAGE_READ_TIME,
  MAX_NODE_MINUTES,
  ReadTime,
  DrillKind,
  LearningStyle,
  MAX_MECHANISM_SECTIONS,
  MapDepth,
  MapLevels,
  ParagraphLength,
  MinutesPerDay,
  StudyDays,
  MapQuestionKind,
  NodeStatus,
  TechnicalDetail,
  TopicArchetype,
  SubtreeShape,
  TopicStatus,
  contentSettingsOf,
  mapShapeOf,
} from "@interestled/schemas";
import type {
  CardContentT,
  CardQuestionT,
  AnsweredQuestionT,
  LearningNodeT,
  ProfileT,
  TopicT,
} from "@interestled/schemas";
// defaultCardSettings moved to the domain package: the app names what a card is
// being written to while it waits for it, so the rule cannot live on the server.
import { defaultCardSettings } from "@interestled/domain";
import {
  SYSTEM,
  atomsPrompt,
  cardPrompt,
  choicesBlock,
  drillPrompt,
  effectiveMapInstructions,
  mapPrompt,
  mapQuestionsPrompt,
  narrationPrompt,
  questionPrompt,
  seedContentInstructions,
  seedMapInstructions,
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
  levels: MapLevels.Two,
  mainHeadings: 5,
  subHeadings: 4,
  minutesPerDay: MinutesPerDay.Twenty,
  days: StudyDays.Fortnight,
  depth: MapDepth.Working,
  mapInstructions: "",
  level: "I use Docker daily\nWant to run a small cluster",
  paragraphLength: ParagraphLength.Medium,
  englishLevel: EnglishLevel.Medium,
  technicalDetail: TechnicalDetail.Medium,
  format: ContentFormat.Prose,
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
  cardInstructions: "",
  createdAt: new Date(),
};

const card: CardContentT = {
  claim: "A controller loops forever comparing what you asked for to what exists.",
  mechanism: [{ heading: "The loop", body: "The API server holds desired state." }],
  example: { setup: "3 replicas, one node dies", result: "a new pod appears in 4s" },
  misconception: { belief: "kubectl creates the pod", correction: "the controller does" },
  jargon: [],
};

/** One answered question, as the map prompt receives it: what was picked, and what was left. */
const outlineChoice: AnsweredQuestionT = {
  kind: MapQuestionKind.Outline,
  question: "How should the subject be cut up?",
  picked: [{ label: "By what breaks", sample: ["Pods that will not start", "Nodes that go away"] }],
  passedOver: [
    { label: "By component", sample: ["The scheduler", "The kubelet"] },
    { label: "By the jobs you do", sample: ["Deploying", "Debugging"] },
  ],
};

const codeChoice: AnsweredQuestionT = {
  kind: MapQuestionKind.Known,
  question: "How much code do you want to see?",
  picked: [
    { label: "Commands you can run", sample: ["`kubectl describe pod web-7d4`"] },
    { label: "Short manifests", sample: ["`replicas: 3`"] },
  ],
  passedOver: [{ label: "No code at all", sample: ["Described in words instead."] }],
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
    level: topic.level,
    shape: mapShapeOf(topic),
    mapInstructions: "- Use 5 main headings, and 4 sub-headings under each one.",
    profile,
    content: contentSettingsOf(topic),
    answered: [],
    ...overrides,
  };
}

const SHAPE = {
  levels: MapLevels.Two,
  mainHeadings: 5,
  subHeadings: 4,
  minutesPerDay: MinutesPerDay.Twenty,
  days: StudyDays.Fortnight,
  depth: MapDepth.Working,
};

describe("seedMapInstructions", () => {
  it("states the counts, the time and the depth as sentences the learner can edit", () => {
    const lines = seedMapInstructions(SHAPE);
    expect(lines).toContain("Use 5 main headings, and 4 sub-headings under each one.");
    expect(lines).toContain("about 280 minutes to work through — 20 minutes a day for 14 days");
    expect(lines).toContain("enough to use it for the everyday cases.");
  });

  it("says where the second count goes when the map is three levels deep", () => {
    // The counts mean different things at each level count, and this text is
    // what the model is actually sent — a line saying "sub-headings under each
    // one" on a three-level map is the settings screen and the prompt
    // disagreeing about what the learner just chose.
    const lines = seedMapInstructions({ ...SHAPE, levels: MapLevels.Three });
    expect(lines).toContain(
      "Use 5 main headings, 4 sub-headings under each of those, and the nodes those need under them.",
    );
  });

  it("calls one day one sitting, rather than 'a day for 1 days'", () => {
    const lines = seedMapInstructions({
      ...SHAPE,
      days: StudyDays.One,
      minutesPerDay: MinutesPerDay.Ten,
    });
    expect(lines).toContain("about 10 minutes, in one sitting.");
    expect(lines).not.toContain("a day for");
  });
});

describe("effectiveMapInstructions", () => {
  it("seeds from the settings while the learner has written nothing", () => {
    expect(effectiveMapInstructions({ ...SHAPE, mapInstructions: "  " })).toBe(
      seedMapInstructions(SHAPE),
    );
  });

  it("uses what they wrote once they have written it, and stops seeding", () => {
    // The settings can only say the things somebody thought to make a setting
    // for. Re-seeding over a sentence they wrote would throw away the answer the
    // box exists to collect.
    expect(effectiveMapInstructions({ ...SHAPE, mapInstructions: "- Just the failures" })).toBe(
      "- Just the failures",
    );
  });
});

describe("seedContentInstructions", () => {
  it("states the sentence range the setting means, not the name of the setting", () => {
    expect(seedContentInstructions(ParagraphLength.Long)).toContain(
      "Each paragraph is 6-8 sentences long.",
    );
    expect(seedContentInstructions(ParagraphLength.Short)).toContain("2-3 sentences");
  });

  it("does not call a paragraph short while asking for eight sentences of it", () => {
    expect(seedContentInstructions(ParagraphLength.Long)).not.toContain("short paragraphs");
  });
});

describe("mapPrompt", () => {
  it("passes what they already know, so branches can be dropped", () => {
    const prompt = mapPrompt(mapInput());
    expect(prompt).toContain("I use Docker daily");
    expect(prompt).toContain("What they already know:");
  });

  it("says so plainly when an answer is blank, rather than sending an empty line", () => {
    const prompt = mapPrompt(mapInput({ title: "French", goal: "", level: "" }));
    expect(prompt).toContain("did not say what they already know");
    expect(prompt).toContain("did not say what they want it for");
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

  it("carries how the topic is written, as what it changes rather than as a name", () => {
    const technical = mapPrompt(
      mapInput({
        content: { ...contentSettingsOf(topic), technicalDetail: TechnicalDetail.High },
      }),
    );
    expect(technical).toContain("the field's own terms");
  });

  it("asks the two axes separately, so plain words can carry the real terms", () => {
    // What the single style chip could never say: every value that offered the
    // terminology also demanded the dense prose around it.
    const prompt = mapPrompt(
      mapInput({
        content: {
          ...contentSettingsOf(topic),
          englishLevel: EnglishLevel.Simple,
          technicalDetail: TechnicalDetail.High,
        },
      }),
    );
    expect(prompt).toContain("everyday words and short sentences");
    expect(prompt).toContain("the field's own terms, notation and real values throughout");
  });

  it("says nothing about the shape when the topic is ordinary prose", () => {
    // A line reading "written as prose" is one more instruction for the model to
    // answer, and prose is what every other rule already describes.
    const prose = mapPrompt(mapInput());
    expect(prose).not.toContain("look up rather than read through");
    const notes = mapPrompt(
      mapInput({ content: { ...contentSettingsOf(topic), format: ContentFormat.ReferenceNotes } }),
    );
    expect(notes).toContain("look up rather than read through");
    // What it changes about the writing, never the enum value that named it.
    expect(notes).not.toContain(ContentFormat.ReferenceNotes);
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

  it("asks for exactly the heading counts the learner chose", () => {
    // The counts reach the shape block as well as the instruction lines: the
    // lines are the learner's to rewrite, and this is what the schema will
    // actually hold the reply to.
    const prompt = mapPrompt(
      mapInput({ shape: { ...mapShapeOf(topic), mainHeadings: 7, subHeadings: 3 } }),
    );
    expect(prompt).toContain("Level 1: 7 groups");
    expect(prompt).toContain("Level 2: 3 nodes inside each group");
  });

  it("asks for the level count the learner chose, and the JSON that goes with it", () => {
    // The block and the schema the reply is parsed by are chosen by the same
    // setting: a prompt asking for one shape and a parse expecting the other is
    // a generation that fails on every attempt.
    const two = mapPrompt(mapInput());
    expect(two).toContain("Produce a TWO-level map.");
    expect(two).not.toContain('"areas"');

    const three = mapPrompt(
      mapInput({ shape: { ...mapShapeOf(topic), levels: MapLevels.Three } }),
    );
    expect(three).toContain("Produce a THREE-level map.");
    expect(three).toContain("Level 1: 5 parts of the subject");
    expect(three).toContain("Level 2: 4 groups inside each area");
    expect(three).toContain('"areas"');
  });

  it("says a group has no minutes, so only the leaves carry time", () => {
    expect(mapPrompt(mapInput())).toContain("it has no minutes");
  });

  it("carries the learner's instruction lines verbatim", () => {
    const prompt = mapPrompt(
      mapInput({ mapInstructions: "- Far less YAML\n- Much more on networking" }),
    );
    expect(prompt).toContain("- Far less YAML");
    expect(prompt).toContain("- Much more on networking");
    expect(prompt).toContain("How they want the map built:");
  });

  it("says nothing about rebuilding the first time round", () => {
    expect(mapPrompt(mapInput())).not.toContain("asked for this to be rebuilt");
  });

  it("carries what they picked, and the sample they picked it from", () => {
    // The label alone is a phrase the model has to interpret; the headings under
    // it are the thing that was actually chosen.
    const prompt = mapPrompt(mapInput({ answered: [outlineChoice] }));
    expect(prompt).toContain("How should the subject be cut up?");
    expect(prompt).toContain("They picked:");
    expect(prompt).toContain("By what breaks");
    expect(prompt).toContain("Pods that will not start");
  });

  it("carries what they passed over, so the rejected cut is not the one built", () => {
    // The four options were only ever meaningful against each other: "these
    // headings rather than those" says more than the headings on their own.
    const prompt = mapPrompt(mapInput({ answered: [outlineChoice] }));
    expect(prompt).toContain("They passed over:");
    expect(prompt).toContain("By component");
    expect(prompt).toContain("The scheduler");
    expect(prompt).toContain("What they passed over is what they saw and\ndid not want");
  });

  it("carries every option when more than one was picked, not just the first", () => {
    const prompt = mapPrompt(mapInput({ answered: [codeChoice] }));
    expect(prompt).toContain("Commands you can run");
    expect(prompt).toContain("Short manifests");
    expect(prompt).toContain("blended into one map");
  });

  it("says nothing at all about choices when every question was skipped", () => {
    const prompt = mapPrompt(mapInput());
    expect(prompt).not.toContain("Build the map they picked");
    expect(prompt).not.toContain("They picked:");
  });

  it("states the instruction lines before the choices, so both are in front of it", () => {
    const prompt = mapPrompt(
      mapInput({ answered: [outlineChoice], mapInstructions: "- Drop the networking entirely" }),
    );
    expect(prompt.indexOf("- Drop the networking entirely")).toBeLessThan(
      prompt.indexOf("By what breaks"),
    );
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

  it("puts each question's picks above the options it passed over", () => {
    const block = choicesBlock([outlineChoice]);
    expect(block.indexOf("They picked:")).toBeLessThan(block.indexOf("They passed over:"));
  });
});

/** Every mapQuestionsPrompt argument, so a test only names what it is about. */
function questionsInput(
  overrides: Partial<Parameters<typeof mapQuestionsPrompt>[0]> = {},
): Parameters<typeof mapQuestionsPrompt>[0] {
  return {
    title: topic.title,
    goal: topic.goal,
    level: topic.level,
      profile,
    content: contentSettingsOf(topic),
    mapInstructions: "- Use 5 main headings, and 4 sub-headings under each one.",
    ...overrides,
  };
}

describe("mapQuestionsPrompt", () => {
  it("asks for all seven kinds, in the order they are put to the learner", () => {
    const prompt = mapQuestionsPrompt(questionsInput());
    const positions = [
      MapQuestionKind.Outline,
      MapQuestionKind.Breakdown,
      MapQuestionKind.Known,
      MapQuestionKind.Recap,
      MapQuestionKind.Scope,
      MapQuestionKind.Examples,
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

  it("shows the instruction lines, so the options fit the map being asked for", () => {
    const prompt = mapQuestionsPrompt(
      questionsInput({ mapInstructions: "- Use 7 main headings, and 3 sub-headings under each one." }),
    );
    expect(prompt).toContain("- Use 7 main headings, and 3 sub-headings under each one.");
  });

  it("carries the same learner and the same writing settings as the map itself", () => {
    // Both axes, because the questions are answered against the writing the
    // learner will actually get: an option sampled in prose they would never be
    // shown is an option chosen on a false premise.
    const prompt = unwrapped(mapQuestionsPrompt(questionsInput()));
    expect(prompt).toContain("Backend engineer, mostly Python");
    expect(prompt).toContain("ordinary adult prose");
    expect(prompt).toContain("the terms that carry weight");
  });

  it("does not send the map being replaced", () => {
    // The learner is describing the map they want, not editing the one they
    // have. Showing the model the old one only invites it to offer that back as
    // one of the four.
    const prompt = mapQuestionsPrompt(questionsInput());
    expect(prompt).not.toContain("The map they have now");
    expect(prompt).not.toContain("Do not offer it back");
  });

  it("asks two of the seven about what to skip, since that is what a known answer buys", () => {
    const prompt = mapQuestionsPrompt(questionsInput());
    expect(prompt).toContain('kind "known"');
    expect(prompt).toContain('kind "recap"');
    expect(prompt).toContain("read what they said they already know");
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
    shape: SubtreeShape.Leaves,
  };

  it("names where the group sits, so a title like 'Taints' has its context", () => {
    const prompt = subtreePrompt(base);
    expect(prompt).toContain("Scheduling › Taints and tolerations");
    expect(prompt).toContain("Rebuild only what belongs under");
  });

  it("names the other groups, so the replacement does not repeat them", () => {
    expect(subtreePrompt(base)).toContain("Networking, Storage");
  });

  it("asks for nodes, because what hangs under a heading is always nodes", () => {
    expect(subtreePrompt(base)).toContain('"nodes"');
    expect(subtreePrompt(base)).not.toContain('"sections"');
  });

  it("asks for groups when the group being rebuilt is the one holding groups", () => {
    // The top of a three-level map. Rebuilding it into bare nodes would flatten
    // that branch of the map and leave the rest of it two levels deeper.
    const prompt = subtreePrompt({ ...base, shape: SubtreeShape.Sections });
    expect(prompt).toContain('"sections"');
    expect(prompt).toContain("Then the nodes inside each group");
    // The rules for a heading, which only the sections form needs.
    expect(prompt).toContain("A group is a heading");
  });

  it("leaves the rest of the map alone, and says so", () => {
    expect(subtreePrompt(base)).toContain(
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

/**
 * A prompt is prose wrapped to eighty columns, so a rule a test names can
 * straddle a line break. Asserting on where the line happened to break is what
 * makes a reflowed paragraph read as a deleted instruction — these tests are
 * about the rules being present, so they compare the text with its wrapping
 * taken out. The outline is the exception and is checked line by line, because
 * there the indentation is the content.
 */
function unwrapped(text: string): string {
  return text.replace(/\s+/g, " ");
}

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

describe("questionPrompt", () => {
  const asked: CardQuestionT = {
    id: "q1",
    nodeId: "n1",
    question: "Why forever?",
    answer: "Because the actual state keeps changing under it.",
    createdAt: new Date(),
  };

  function questionInput(
    overrides: Partial<Parameters<typeof questionPrompt>[0]> = {},
  ): Parameters<typeof questionPrompt>[0] {
    return {
      topic,
      node,
      nodes: [node],
      card,
      settings: defaultCardSettings(topic, node, 3),
      question: "What happens if two controllers disagree?",
      earlier: [],
      profile,
      ...overrides,
    };
  }

  it("answers against the card the learner read, in one paragraph its length", () => {
    const prompt = unwrapped(questionPrompt(questionInput()));
    expect(prompt).toContain("What happens if two controllers disagree?");
    // The whole card, under the names the reader saw: the answer has to be
    // able to point at a section rather than repeat it.
    expect(prompt).toContain(card.claim);
    expect(prompt).toContain("The loop: The API server holds desired state.");
    expect(prompt).toContain("Concretely: 3 replicas, one node dies");
    expect(prompt).toContain("What people get wrong: kubectl creates the pod");
    // One paragraph, the length the card's paragraphs are — said outright, not
    // only through standing instructions the learner may have rewritten.
    expect(prompt).toContain("One paragraph, 4-5 sentences long");
    expect(prompt).toContain('Return JSON: {"answer"}');
  });

  it("takes the paragraph length from the card's settings", () => {
    const short = questionPrompt(
      questionInput({
        settings: { ...defaultCardSettings(topic, node, 3), paragraphLength: ParagraphLength.Short },
      }),
    );
    expect(unwrapped(short)).toContain("One paragraph, 2-3 sentences long");
  });

  it("carries the earlier questions on the card, so a follow-up follows", () => {
    const prompt = unwrapped(questionPrompt(questionInput({ earlier: [asked] })));
    expect(prompt).toContain("What they asked on this card before");
    expect(prompt).toContain("Q: Why forever?");
    expect(prompt).toContain("A: Because the actual state keeps changing under it.");
    // And nothing about earlier questions when there were none.
    expect(questionPrompt(questionInput())).not.toContain("What they asked on this card before");
  });

  it("writes the answer under the card's own instructions", () => {
    const prompt = questionPrompt(
      questionInput({
        settings: { ...defaultCardSettings(topic, node, 3), instructions: "Answers in French" },
      }),
    );
    expect(prompt).toContain("Answers in French");
  });
});

describe("cardPrompt", () => {
  it("sends the card's own instructions after the topic's, and says which wins", () => {
    // What the learner asked for this card in particular. After the standing
    // instructions rather than joined onto them, because the two are different
    // in kind and the model has to be told which one wins.
    const prompt = unwrapped(
      cardPrompt(withSettings({ instructions: "Compare it with how Postgres does it" })),
    );
    expect(prompt).toContain("For this card in particular, they also asked:");
    expect(prompt).toContain("Compare it with how Postgres does it");
    expect(prompt).toContain("win where the two disagree");
    expect(prompt.indexOf("Standing instructions for this topic")).toBeLessThan(
      prompt.indexOf("For this card in particular"),
    );
  });

  it("says nothing about card instructions when there are none", () => {
    // A labelled blank is a thing the model answers.
    expect(cardPrompt(cardInput())).not.toContain("For this card in particular");
  });

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
    expect(unwrapped(prompt)).toContain("200 words in all");
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
    expect(unwrapped(prompt)).toContain("2000 words in all");
    expect(unwrapped(prompt)).toContain("1600 are the mechanism");
    // Length comes from more items, not from longer ones — a wall of text is
    // still a wall of text at ten minutes (A1).
    expect(prompt).toContain("15-25 sections");
    expect(unwrapped(prompt)).toContain("about 80 words");
  });

  it("stops at what one card can hold, however long the node claims", () => {
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
    // The controls under a card: this card's own answers reach the prompt, and
    // the topic's do not.
    const notes = cardPrompt(withSettings({ format: ContentFormat.ReferenceNotes }));
    expect(notes).toContain("something to look up rather than read through");

    const plain = cardPrompt(withSettings({ englishLevel: EnglishLevel.Simple }));
    expect(plain).toContain("everyday words and short sentences");
    expect(plain).not.toContain("ordinary adult prose");

    const detailed = cardPrompt(withSettings({ technicalDetail: TechnicalDetail.High }));
    expect(detailed).toContain("the field's own terms, notation and real values throughout");
    expect(detailed).not.toContain("Reach for the field's vocabulary only where nothing else");
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
    expect(unwrapped(prompt)).toContain("Nothing that is true of the whole topic belongs on one node");
    expect(prompt).toContain("it belongs on neither");
    // And the misconception slot, which is where it lands most often.
    expect(unwrapped(prompt)).toContain("what people actually get wrong HERE");
  });

  it("asks for one continuous explanation rather than separate notes", () => {
    const prompt = unwrapped(cardPrompt(cardInput({})));
    expect(prompt).toContain("one continuous explanation");
    expect(prompt).toContain("starts from what the one above it established");
    expect(prompt).toContain("reordered without a reader noticing");
    // Each slot is joined to the one above it, not just the sentences inside one.
    expect(prompt).toContain("that same mechanism happening");
    expect(prompt).toContain("names the step above that rules it out");
  });

  it("asks for headings that name a step, not headings that label a term", () => {
    // The heading is a real field now, so the old ban on gluing one to a
    // sentence is gone — but the failure it was there to stop is not. A card
    // whose headings are terms is a glossary, whatever the schema says, and the
    // sentences under them stop needing each other.
    const prompt = unwrapped(cardPrompt(cardInput({})));
    expect(prompt).toContain("says what this step of the argument does");
    expect(prompt).toContain("is a label on a term");
    expect(prompt).toContain("they are a glossary rather than an explanation");
    // And the flow inside a section, which is the half a heading makes easy to lose.
    expect(prompt).toContain("Each sentence follows from the one before it");
    expect(prompt).toContain("never open a body by restating its own heading");
    // Plain text, because it is set as a heading rather than parsed as one.
    expect(prompt).toContain("Plain text, so no");
  });

  it("says when a slot is written and when it is left out, rather than demanding six", () => {
    // The Weimar case: a node that is itself one historical episode has no
    // second case to instantiate it with, so the example slot came back as the
    // node restated under a heading promising something new. A slot the node
    // cannot fill honestly gets filled dishonestly.
    const prompt = unwrapped(cardPrompt(cardInput()));
    expect(prompt).toContain("Leave it out when the node already is one case");
    expect(prompt).toContain("Leave it out when the node is descriptive");
    expect(prompt).toContain("Leave `example` or `misconception` out of the JSON entirely");
    // And the two that are never optional, because they are the card.
    expect(prompt).toContain("**claim** — required");
    expect(prompt).toContain("**mechanism** — required");
    expect(prompt).not.toContain("Six slots, all required");
  });

  it("spends the read time on the mechanism rather than spreading it evenly", () => {
    // Four fifths of the words, and an item count computed from that share: a
    // fixed count and a fixed item length already decide the card's length, so
    // naming a read time as well made the read time the part that gave way.
    const long = { ...topic, averageReadTime: ReadTime.Five };
    const bigNode = { ...node, minutes: 5 };
    const prompt = unwrapped(
      cardPrompt(
        cardInput({
          topic: long,
          node: bigNode,
          nodes: [bigNode],
          settings: defaultCardSettings(long, bigNode, 3),
        }),
      ),
    );
    expect(prompt).toContain("1000 words in all");
    expect(prompt).toContain("800 are the mechanism");
    expect(prompt).toContain("8-13 sections");
  });

  it("never asks for more sections than the schema will accept", () => {
    // A count the prompt asks for and the schema then refuses is a card that
    // fails validation for doing as it was told.
    for (const minutes of [1, 2, 3, 5, 7, 10]) {
      const prompt = cardPrompt(withSettings({ minutes }));
      const range = /(\d+)-(\d+) sections/.exec(prompt);
      expect(range).not.toBeNull();
      expect(Number(range![2])).toBeLessThanOrEqual(MAX_MECHANISM_SECTIONS);
      expect(Number(range![1])).toBeGreaterThanOrEqual(1);
    }
  });

  it("lets reference notes stay flat, because that is what was asked for", () => {
    // The one register that wants no linking sentences at all. Without the
    // carve-out the card asks for a chain and the style asks for entries, and
    // the model picks one.
    const prompt = cardPrompt(withSettings({ format: ContentFormat.ReferenceNotes }));
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

describe("narrationPrompt", () => {
  function narrationInput(
    overrides: Partial<Parameters<typeof narrationPrompt>[0]> = {},
  ): Parameters<typeof narrationPrompt>[0] {
    return { topic, node, card, settings: defaultCardSettings(topic, node, 3), ...overrides };
  }

  it("is given the card and nothing else of the map", () => {
    const prompt = unwrapped(narrationPrompt(narrationInput()));
    expect(prompt).toContain(card.claim);
    expect(prompt).toContain("The loop: The API server holds desired state.");
    expect(prompt).toContain("Concretely: 3 replicas, one node dies");
    expect(prompt).toContain('Return JSON: {"script"}');
  });

  it("says what to do with the parts of a card that cannot be read out", () => {
    // The whole point of the feature: a formula or a snippet said character by
    // character is worse than silence, and pointing at it is what a person
    // reading a card to somebody actually does.
    const prompt = unwrapped(narrationPrompt(narrationInput()));
    expect(prompt).toContain("Never say a symbol");
    expect(prompt).toContain("Never read a line out");
    expect(prompt).toContain("Point at the card by what is written on it");
  });

  it("turns off the one system rule that would be spoken aloud", () => {
    // SYSTEM says every string is rendered as Markdown and to write Markdown.
    // Left standing, the asterisks and backticks are read out as words.
    const prompt = unwrapped(narrationPrompt(narrationInput()));
    expect(prompt).toContain("The hard rule about writing Markdown is the one rule that does not hold here");
    expect(prompt).toContain("Every other hard rule stands");
  });

  it("asks for as long spoken as the card takes to read", () => {
    const prompt = unwrapped(narrationPrompt(narrationInput()));
    expect(prompt).toContain("About 450 words, which is roughly 3 minutes spoken");
  });

  it("scales with the card's own length rather than the topic's", () => {
    const longer = narrationPrompt(
      narrationInput({ settings: { ...defaultCardSettings(topic, node, 3), minutes: 6 } }),
    );
    expect(unwrapped(longer)).toContain("About 900 words, which is roughly 6 minutes spoken");
  });

  it("speaks it in the register the card was written in", () => {
    const simple = narrationPrompt(
      narrationInput({
        settings: { ...defaultCardSettings(topic, node, 3), englishLevel: EnglishLevel.Simple },
      }),
    );
    expect(unwrapped(simple)).toContain("everyday words and short sentences");
  });

  it("says it as prose whatever shape the topic is written in", () => {
    // Reference notes are a thing you scan. Read aloud, "each rule stated flat
    // with no linking sentences" is a list nobody can follow without the page.
    const notes = narrationPrompt(
      narrationInput({
        topic: { ...topic, format: ContentFormat.ReferenceNotes },
        settings: {
          ...defaultCardSettings(topic, node, 3),
          format: ContentFormat.ReferenceNotes,
        },
      }),
    );
    expect(unwrapped(notes)).not.toContain("No linking sentences between them");
  });

  it("carries the learner's standing instructions, which do not stop at audio", () => {
    const prompt = narrationPrompt(
      narrationInput({ topic: { ...topic, contentInstructions: "Answer in French." } }),
    );
    expect(prompt).toContain("Answer in French.");
  });

  it("carries what they asked for this card in particular", () => {
    const prompt = narrationPrompt(
      narrationInput({
        settings: {
          ...defaultCardSettings(topic, node, 3),
          instructions: "Compare it with Nomad",
        },
      }),
    );
    expect(prompt).toContain("Compare it with Nomad");
  });
});

describe("drillPrompt", () => {
  it("requires the prompt to stand alone, with no reference to a previous screen", () => {
    const prompt = drillPrompt({ node, kind: DrillKind.Apply, card, content: contentSettingsOf(topic) });
    expect(prompt).toContain("never refer to");
  });

  it("drops the misconception line rather than labelling an empty one", () => {
    // A label with nothing after it is worse than no label: the model answers
    // it, and the drill is then written against a misconception nobody wrote.
    const bare: CardContentT = { ...card, example: undefined, misconception: undefined };
    const prompt = drillPrompt({ node, kind: DrillKind.Apply, card: bare, content: contentSettingsOf(topic) });
    expect(prompt).not.toContain("Common misconception:");
    expect(prompt).toContain("Mechanism:");
    // And it is still there when the card has one.
    expect(drillPrompt({ node, kind: DrillKind.Apply, card, content: contentSettingsOf(topic) })).toContain(
      "Common misconception: kubectl creates the pod",
    );
  });

  it("asks a predict drill for a commitment before the reveal", () => {
    expect(
      drillPrompt({ node, kind: DrillKind.Predict, card, content: contentSettingsOf(topic) }),
    ).toContain("BEFORE any answer is shown");
  });
});

describe("atomsPrompt", () => {
  it("extracts review items from what the card actually said", () => {
    const prompt = atomsPrompt({ node, card, content: contentSettingsOf(topic) });
    expect(prompt).toContain("Worked example:");
    expect(prompt).toContain("Misconception:");
  });

  it("names neither slot when the card was written without them", () => {
    const bare: CardContentT = { ...card, example: undefined, misconception: undefined };
    const prompt = atomsPrompt({ node, card: bare, content: contentSettingsOf(topic) });
    expect(prompt).not.toContain("Worked example:");
    expect(prompt).not.toContain("Misconception:");
    // The heading goes down with its body: a drill is written against what the
    // card said, and dropping it loses the step the paragraph is about.
    expect(prompt).toContain("Mechanism: The loop. The API server holds desired state.");
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
