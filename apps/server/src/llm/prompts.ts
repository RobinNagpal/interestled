import {
  ContentStyle,
  DepthAction,
  DrillKind,
  LearningStyle,
  MAX_NODE_MINUTES,
  MapLevels,
  contentSettingsOf,
} from "@interestled/schemas";
import type {
  CardContentT,
  LearningNodeT,
  ProfileT,
  TopicContentSettingsT,
  TopicT,
} from "@interestled/schemas";
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
 * What each content style actually changes about the writing. Same reason the
 * learning styles have a guide: "write it in the short_and_crisp style" is an
 * instruction that changes nothing at all.
 *
 * None of these names a depth. Depth decides how far down the mechanism the
 * explanation goes; these decide the words it is written in and how many of
 * them, which is a different question and asked in a different place.
 */
const CONTENT_STYLE_GUIDE: Record<ContentStyle, string> = {
  [ContentStyle.ShortAndCrisp]:
    "as few words as it takes. One example, no second pass over the same idea, nothing restated.",
  [ContentStyle.ShortAndTechnical]:
    "as few words as it takes, in the field's own terms and without stopping to gloss them. They have the vocabulary and want the answer, not the introduction.",
  [ContentStyle.PlainAndDeep]:
    "all the way to the mechanism, in everyday words. Every technical term either replaced with a plain one or glossed the first time it appears.",
  [ContentStyle.TechnicalAndDeep]:
    "all the way to the mechanism, in the field's own terms, used precisely. They want the real thing rather than a simplification.",
  [ContentStyle.ReferenceNotes]:
    "as something to look up rather than read through: the rule, the exact conditions it holds under, and the real values, each stated flat on its own. No linking sentences between them.",
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
    styleRule: CONTENT_STYLE_GUIDE[content.style],
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

export function mapPrompt(input: {
  title: string;
  goal: string;
  timeBudget: string;
  level: string;
  levels: MapLevels;
  profile: ProfileT;
  /** How this topic is written: style, standing instructions, and node length. */
  content: TopicContentSettingsT;
  /** What to change, when the learner asked for the map again. "" the first time. */
  instructions: string;
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
    instructions: instructionBlock(input.instructions),
    archetypes: promptFile("archetypes"),
    shape,
    ordering: promptFile("ordering"),
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

const VARIANT_GUIDE: Record<string, string> = {
  base: "",
  [DepthAction.MoreConcrete]:
    "Replace every abstraction with one specific instance. Real values throughout.",
  [DepthAction.WhyItMatters]:
    "Focus on consequence: what decision this changes, and what it costs to get wrong.",
  [DepthAction.WhereThisBreaks]:
    "Focus on the edges: when this model is wrong, and what people hit in practice.",
};

/** Ordinary adult prose. Only used to turn the minutes into a length the model can aim at. */
const WORDS_PER_MINUTE = 200;

/**
 * The most card there can be, whatever the topic's read time says. The six slots
 * hold about a thousand words between them before CardContent's own limits
 * refuse the card, so asking for a fifteen-minute one produces either padding or
 * a response the schema throws away. The rest of a long node is the drill and
 * the doing, which is where the minutes past this actually go.
 */
const CARD_MINUTES_MAX = 4;

export function cardPrompt(input: {
  topic: TopicT;
  node: LearningNodeT;
  depth: number;
  variant: string;
  profile: ProfileT;
}): string {
  // The setting says how long a card should take; the node's own estimate is
  // what the map has already promised this one costs. Taking the smallest keeps
  // both true — a longer card than the map admits to is the map lying about
  // time, which is the one thing it is not allowed to do.
  const minutes = Math.max(
    1,
    Math.min(input.node.minutes, input.topic.averageReadTime, CARD_MINUTES_MAX),
  );
  return render(promptFile("card"), {
    topic: input.topic.title,
    node: input.node.title,
    claim: input.node.claim,
    depthGuide: DEPTH_GUIDE[input.depth] ?? DEPTH_GUIDE[3]!,
    variantGuide: VARIANT_GUIDE[input.variant] ?? "",
    learner: learnerBlock(input.profile),
    contentRules: contentRulesBlock(contentSettingsOf(input.topic)),
    readTime: minutesText(minutes),
    readWords: String(minutes * WORDS_PER_MINUTE),
  });
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
    mechanism: input.card.mechanism.join(" "),
    misconception: input.card.misconception.belief,
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
  return render(promptFile("atoms"), {
    contentRules: contentRulesBlock(input.content),
    node: input.node.title,
    claim: input.card.claim,
    mechanism: input.card.mechanism.join(" "),
    example: `${input.card.example.setup} → ${input.card.example.result}`,
    misconception: `${input.card.misconception.belief} (in fact: ${input.card.misconception.correction})`,
  });
}
