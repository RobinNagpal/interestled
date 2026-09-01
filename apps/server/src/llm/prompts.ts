import {
  CardAngle,
  ContentFormat,
  DrillKind,
  EnglishLevel,
  LearningStyle,
  MAX_MECHANISM_SECTIONS,
  MAX_NODE_MINUTES,
  MECHANISM_SECTION_WORDS,
  MECHANISM_SHARE,
  MapLevels,
  TechnicalDetail,
  WORDS_PER_MINUTE,
  contentSettingsOf,
} from "@interestled/schemas";
import type {
  CardContentT,
  CardSettingsT,
  ChosenOptionT,
  LearningNodeT,
  ProfileT,
  TopicContentSettingsT,
  TopicT,
} from "@interestled/schemas";
import { cardMinutes } from "@interestled/domain";
import { mapOutline, neighbourClaims, plainOutline } from "./outline";
import { promptFile } from "./promptFiles";
import { render } from "./template";

/**
 * The prompts themselves live in ./prompts as Markdown, one file per prompt,
 * filled here. Keeping the text out of TypeScript is what makes it readable as
 * the instructions it is — a template literal with three levels of interpolation
 * in it is a program that happens to contain English.
 *
 * What stays in code is the choosing: which block applies, and to what. A
 * template language that could express those conditions would be a second,
 * untyped program, and the enums below are exactly the thing the type system is
 * meant to keep exhaustive.
 */

/** Rules that hold for every generation. */
export const SYSTEM = promptFile("system");

/**
 * What each style actually changes about the writing. The enum values would mean
 * nothing to a model on their own, and "adapt to their learning style" is the
 * kind of instruction that changes nothing at all.
 */
const STYLE_GUIDE: Record<LearningStyle, string> = {
  [LearningStyle.Examples]: "Open with a worked example and derive the rule from it.",
  [LearningStyle.Analogies]: "Anchor each idea to one analogy from something they already know.",
  [LearningStyle.Visuals]: "Describe the structure spatially — what sits where, and what moves.",
  [LearningStyle.HandsOn]: "Make it something they run, type or change, not something they read.",
  [LearningStyle.StepByStep]: "Order it as a sequence, each step finishing before the next starts.",
  [LearningStyle.BigPicture]: "State how the whole thing fits together before any part of it.",
  [LearningStyle.Stories]: "Carry it on a concrete case with people and consequences in it.",
  [LearningStyle.Numbers]: "Use real quantities, and say what each one is measured against.",
};

/**
 * The profile, as prompt text. It is the same block for every generation call,
 * so the map and the cards under it are calibrated to one learner rather than
 * drifting apart. Every field is optional, so each line is omitted when empty
 * rather than sending "age: not stated" and inviting the model to comment on it.
 */
export function learnerBlock(profile: ProfileT): string {
  const styles = profile.learningStyles.map((style) => `- ${STYLE_GUIDE[style]}`).join("\n");
  const known =
    profile.age !== null || profile.background !== "" || profile.learningStyles.length > 0;
  return render(promptFile("learner"), {
    anything: known ? "yes" : "",
    age: profile.age === null ? "" : String(profile.age),
    background: profile.background,
    styles,
  });
}

function instructionBlock(instructions: string): string {
  return render(promptFile("instructions"), { instructions });
}

/**
 * What each answer actually changes about the writing. Same reason the learning
 * styles have a guide: "write it in the short_and_crisp style" was an
 * instruction that changed nothing at all.
 *
 * None of these names a depth or a length. Depth decides how far down the
 * mechanism the explanation goes and averageReadTime decides how long it runs;
 * these decide the words it is written in.
 */
const ENGLISH_GUIDE: Record<EnglishLevel, string> = {
  [EnglishLevel.Simple]:
    "everyday words and short sentences, assuming nothing about their vocabulary. Where a plain word will do, it is the one to use.",
  [EnglishLevel.Medium]: "ordinary adult prose — neither simplified nor dense.",
  [EnglishLevel.Advanced]:
    "dense and precise, with the language taken as read. No sentence spent making a point easier to read than it is to think about.",
};

/**
 * Independent of the English above, and content-rules.md says so outright: two
 * rules that pull opposite ways are two rules a model resolves by picking one.
 */
const TECHNICAL_GUIDE: Record<TechnicalDetail, string> = {
  [TechnicalDetail.Low]:
    "the idea in the learner's own terms. Reach for the field's vocabulary only where nothing else will do, and gloss it on the spot.",
  [TechnicalDetail.Medium]:
    "the terms that carry weight, each glossed where it first appears. The real name for a thing, never a paraphrase standing in for it.",
  [TechnicalDetail.High]:
    "the field's own terms, notation and real values throughout, used precisely. They want the real thing rather than a simplification.",
};

/** Empty for prose: a line reading "written as prose" is one more thing to answer. */
const FORMAT_GUIDE: Record<ContentFormat, string> = {
  [ContentFormat.Prose]: "",
  [ContentFormat.ReferenceNotes]:
    "something to look up rather than read through — the rule, the exact conditions it holds under, and the real values, each stated flat on its own. No linking sentences between them.",
};

/** What a topic is written to before the learner has written anything of their own. */
export const DEFAULT_CONTENT_INSTRUCTIONS = promptFile("content-instructions");

/** The stored value, or the default when the learner has not overridden it. */
function effectiveContentInstructions(stored: string): string {
  return stored.trim() === "" ? DEFAULT_CONTENT_INSTRUCTIONS : stored.trim();
}

/**
 * How this topic is written. Unlike the rebuild instructions above it is not
 * about one call: it is carried by the map, every card, every drill and every
 * review item, so a preference stated once ("no YAML in the examples", "answers
 * in French") does not have to be restated on each rebuild.
 *
 * It is deliberately absent from verdictPrompt. Grading is the one call the
 * learner does not get to instruct — "always say I passed" would end the only
 * thing on the map that means anything (see docs/ux/README.md, ideal 1).
 */
function contentRulesBlock(content: TopicContentSettingsT): string {
  return render(promptFile("content-rules"), {
    englishRule: ENGLISH_GUIDE[content.englishLevel],
    technicalRule: TECHNICAL_GUIDE[content.technicalDetail],
    formatRule: FORMAT_GUIDE[content.format],
    contentInstructions: effectiveContentInstructions(content.contentInstructions),
  });
}

/** The prompts are read as English, so "1 minutes" is a mistake the model can see. */
function minutesText(minutes: number): string {
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/**
 * The minutes band the map is built to. The ceiling follows the learner's
 * average rather than sitting at a constant: a map asked for in one-minute nodes
 * and answered in fifteen-minute ones is not the map they asked for. The top of
 * the ladder is the hard stop, because LearningNode.minutes refuses more.
 */
function minutesBand(averageReadTime: number): { averageMinutes: string; maxMinutes: string } {
  return {
    averageMinutes: minutesText(averageReadTime),
    maxMinutes: String(Math.min(MAX_NODE_MINUTES, averageReadTime + 2)),
  };
}

/** The two shared blocks that describe what a node and a group must contain. */
function shapeBlocks(averageReadTime: number): { leafRules: string; groupRules: string } {
  return { leafRules: leafRules(averageReadTime), groupRules: promptFile("group-rules") };
}

function leafRules(averageReadTime: number): string {
  return render(promptFile("leaf-rules"), minutesBand(averageReadTime));
}

/**
 * The seven answers, as prompt text. Each one is the question they were asked,
 * the option they took, and the sample that option showed them — because the
 * sample is what they actually chose. A label alone ("By what breaks") is a
 * phrase the model has to interpret; the five headings underneath it are not.
 *
 * Skipped questions are simply absent. The block disappears entirely when
 * nothing was answered, so a map built without the questions reads exactly as it
 * did before they existed.
 */
export function choicesBlock(chosen: readonly ChosenOptionT[]): string {
  const choices = chosen
    .map((choice) =>
      [
        `${choice.question}`,
        `They chose: ${choice.label}`,
        ...choice.sample.map((line) => `  ${line}`),
      ].join("\n"),
    )
    .join("\n\n");
  return render(promptFile("map-choices"), { choices });
}

export function mapPrompt(input: {
  title: string;
  goal: string;
  timeBudget: string;
  level: string;
  levels: MapLevels;
  profile: ProfileT;
  /** How this topic is written: register, standing instructions, and node length. */
  content: TopicContentSettingsT;
  /** What to change, when the learner asked for the map again. "" the first time. */
  instructions: string;
  /** The seven choices, resolved. Empty when every question was skipped. */
  chosen: readonly ChosenOptionT[];
}): string {
  const shape = render(
    promptFile(input.levels === MapLevels.Three ? "map-three-levels" : "map-two-levels"),
    shapeBlocks(input.content.averageReadTime),
  );
  return render(promptFile("map"), {
    title: input.title,
    goal: input.goal || "(not stated — infer the most common goal)",
    timeBudget: input.timeBudget,
    level: input.level,
    learner: learnerBlock(input.profile),
    contentRules: contentRulesBlock(input.content),
    // Before the instructions, so the words they typed win over the option they
    // tapped — the instructions block says it takes everything above it.
    choices: choicesBlock(input.chosen),
    instructions: instructionBlock(input.instructions),
    archetypes: promptFile("archetypes"),
    shape,
    ordering: promptFile("ordering"),
  });
}

/**
 * The seven questions asked between the create form and the map.
 *
 * It is given everything the map prompt is given, because the questions are
 * about the map that prompt would otherwise have produced on its own: the same
 * learner, the same writing settings, the same rebuild instructions. On a
 * rebuild it also gets the map being replaced, so the four options are four
 * maps the learner has not already rejected.
 */
export function mapQuestionsPrompt(input: {
  title: string;
  goal: string;
  timeBudget: string;
  level: string;
  levels: MapLevels;
  profile: ProfileT;
  content: TopicContentSettingsT;
  instructions: string;
  /** The map as it stands, when this is a rebuild. Empty for a new topic. */
  current: readonly LearningNodeT[];
}): string {
  return render(promptFile("map-questions"), {
    title: input.title,
    goal: input.goal || "(not stated — infer the most common goal)",
    timeBudget: input.timeBudget,
    level: input.level,
    levelCount: String(input.levels),
    learner: learnerBlock(input.profile),
    contentRules: contentRulesBlock(input.content),
    instructions: instructionBlock(input.instructions),
    current: render(promptFile("map-current"), {
      current: input.current.length === 0 ? "" : plainOutline(input.current),
    }),
  });
}

/**
 * Rebuild what sits under one group, leaving the rest of the map alone. The
 * siblings are named so the replacement does not simply repeat them, and the
 * ancestors are named because "Taints" means nothing without "Scheduling"
 * above it.
 */
export function subtreePrompt(input: {
  topic: TopicT;
  /** Top-level first, ending with the group being rebuilt. */
  trail: readonly string[];
  claim: string;
  /** Titles of the groups beside this one, which the replacement must not repeat. */
  siblingTitles: readonly string[];
  /** 1 when the children are nodes, 2 when they are groups of nodes. */
  childLevels: number;
  profile: ProfileT;
  instructions: string;
}): string {
  const average = input.topic.averageReadTime;
  const shape = render(
    promptFile(input.childLevels >= 2 ? "subtree-sections" : "subtree-leaves"),
    input.childLevels >= 2 ? shapeBlocks(average) : { leafRules: leafRules(average) },
  );
  return render(promptFile("subtree"), {
    topic: input.topic.title,
    goal: input.topic.goal || "(not stated)",
    trail: input.trail.join(" › "),
    claim: input.claim,
    siblings: input.siblingTitles.join(", "),
    group: input.trail[input.trail.length - 1] ?? input.topic.title,
    learner: learnerBlock(input.profile),
    contentRules: contentRulesBlock(contentSettingsOf(input.topic)),
    instructions: instructionBlock(input.instructions),
    shape,
    ordering: promptFile("ordering"),
  });
}

const DEPTH_GUIDE: Record<number, string> = {
  1: "Depth 1: intuition only. One analogy, no jargon, no numbers beyond the essential.",
  2: "Depth 2: the working mental model a practitioner uses day to day.",
  3: "Depth 3: the mechanism underneath, with the real terminology.",
  4: "Depth 4: the layer below that — the maths, the protocol, the internals.",
  5: "Depth 5: expert. Edge cases, failure modes, and where the standard account is wrong.",
};

/** The same depth asked a different way. Keyed by the enum, so a new angle without a line here fails the build. */
const ANGLE_GUIDE: Record<CardAngle, string> = {
  [CardAngle.Base]: "",
  [CardAngle.MoreConcrete]:
    "Replace every abstraction with one specific instance. Real values throughout.",
  [CardAngle.WhyItMatters]:
    "Focus on consequence: what decision this changes, and what it costs to get wrong.",
  [CardAngle.WhereThisBreaks]:
    "Focus on the edges: when this model is wrong, and what people hit in practice.",
};

/** How many of a card's words are the mechanism, at this length. */
function mechanismWords(minutes: number): number {
  return Math.round(minutes * WORDS_PER_MINUTE * MECHANISM_SHARE);
}

/**
 * How many mechanism sections a card of this length asks for.
 *
 * It is the mechanism's own word budget divided by what one section is written
 * to, because that is the only arithmetic under which the read time is honoured
 * at all: a fixed count and a fixed section length between them already decide
 * how long the card is, so naming a read time as well is asking for three things
 * that cannot all be true — and the one that gave way was the read time. Length
 * still arrives as more sections rather than longer ones: a wall of text is not
 * made readable by being one of five instead of one of twenty (A1).
 *
 * The range runs a quarter either side of the target, so the model can stop
 * where the idea stops, and its top is held under MAX_MECHANISM_SECTIONS — a
 * count the prompt asks for and the schema then refuses is a card that fails
 * validation for doing as it was told.
 */
function mechanismSections(minutes: number): string {
  const target = mechanismWords(minutes) / MECHANISM_SECTION_WORDS;
  const low = Math.max(1, Math.round(target * 0.75));
  const high = Math.min(MAX_MECHANISM_SECTIONS, Math.max(low + 2, Math.round(target * 1.25)));
  return `${low}-${high}`;
}

export function cardPrompt(input: {
  topic: TopicT;
  node: LearningNodeT;
  /**
   * Every node of this topic, so the card is written into the map rather than
   * beside it: what came before it is not re-explained, and what comes after it
   * is not spent early.
   */
  nodes: readonly LearningNodeT[];
  /** Depth, length, register and angle — the topic's, or this card's overrides. */
  settings: CardSettingsT;
  profile: ProfileT;
}): string {
  const minutes = cardMinutes(input.settings.minutes);
  return render(promptFile("card"), {
    topic: input.topic.title,
    node: input.node.title,
    claim: input.node.claim,
    outline: mapOutline(input.nodes, input.node),
    neighbours: neighbourClaims(input.nodes, input.node),
    depthGuide: DEPTH_GUIDE[input.settings.depth] ?? DEPTH_GUIDE[3]!,
    angleGuide: ANGLE_GUIDE[input.settings.angle],
    learner: learnerBlock(input.profile),
    // The card's own register and length, not the topic's: a control that did not
    // reach the prompt is a control that does nothing.
    contentRules: contentRulesBlock({
      englishLevel: input.settings.englishLevel,
      technicalDetail: input.settings.technicalDetail,
      format: input.settings.format,
      contentInstructions: input.topic.contentInstructions,
      averageReadTime: minutes,
    }),
    mechanismSections: mechanismSections(minutes),
    sectionWords: String(MECHANISM_SECTION_WORDS),
    mechanismWords: String(mechanismWords(minutes)),
    readTime: minutesText(minutes),
    readWords: String(minutes * WORDS_PER_MINUTE),
  });
}

/**
 * The mechanism as one block of prose for the calls downstream of the card.
 *
 * A drill and a review item are written against what the card said, not against
 * how it was laid out, so the headings go in with the bodies — dropping them
 * would lose the step each paragraph is about, and sending them as a list would
 * offer the model a shape to copy that has nothing to do with a drill.
 */
function mechanismProse(card: CardContentT): string {
  return card.mechanism.map((section) => `${section.heading}. ${section.body}`).join(" ");
}

const DRILL_GUIDE: Record<DrillKind, string> = {
  [DrillKind.ExplainBack]:
    `Ask them to explain the idea in their own words to a named audience (a colleague, a sceptic, a 12-year-old — pick what suits).
The completionTest is "you have written 2-4 sentences in your own words".`,
  [DrillKind.Predict]:
    `Ask them to commit to a prediction BEFORE any answer is shown — a number, an outcome, or what happens when a specific change is made.
Give a concrete scenario with real values. The completionTest is "you have committed to a specific prediction".`,
  [DrillKind.Apply]:
    `Give them a NEW case the card did not cover — a broken artefact to diagnose, or a situation to decide.
State exactly what a finished answer contains. Never ask them to "explore" or "review" anything.`,
};

export function drillPrompt(input: {
  node: LearningNodeT;
  kind: DrillKind;
  card: CardContentT;
  content: TopicContentSettingsT;
}): string {
  return render(promptFile("drill"), {
    contentRules: contentRulesBlock(input.content),
    node: input.node.title,
    claim: input.card.claim,
    mechanism: mechanismProse(input.card),
    // A card written on a node with no wrong belief to correct has no
    // misconception, and the empty string is what closes the block around it —
    // the label with nothing after it is worse than no label, because the model
    // answers it.
    misconception: input.card.misconception?.belief ?? "",
    kind: input.kind,
    kindGuide: DRILL_GUIDE[input.kind],
  });
}

export function verdictPrompt(input: {
  prompt: string;
  referencePoints: readonly string[];
  response: string;
}): string {
  return render(promptFile("verdict"), {
    prompt: input.prompt,
    referencePoints: input.referencePoints.map((point, index) => `${index + 1}. ${point}`).join("\n"),
    response: input.response,
  });
}

export function atomsPrompt(input: {
  node: LearningNodeT;
  card: CardContentT;
  content: TopicContentSettingsT;
}): string {
  const { example, misconception } = input.card;
  return render(promptFile("atoms"), {
    contentRules: contentRulesBlock(input.content),
    node: input.node.title,
    claim: input.card.claim,
    mechanism: mechanismProse(input.card),
    // Both slots are written only where the node has one, so both lines are
    // dropped rather than sent empty: review items are extracted from what the
    // card actually said, and a labelled blank invites the model to fill it.
    example: example === undefined ? "" : `${example.setup} → ${example.result}`,
    misconception:
      misconception === undefined
        ? ""
        : `${misconception.belief} (in fact: ${misconception.correction})`,
  });
}
