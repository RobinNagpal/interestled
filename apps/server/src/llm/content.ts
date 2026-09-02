import { z } from "zod";
import {
  CardAnswer,
  CardContent,
  GeneratedAtom,
  GeneratedLeafChildren,
  GeneratedTwoLevelMap,
  MapQuestionSet,
  Verdict,
  flattenLeafChildren,
  flattenTwoLevelMap,
} from "@interestled/schemas";
import type {
  AnsweredQuestionT,
  CardAnswerT,
  CardContentT,
  CardQuestionT,
  CardSettingsT,
  DrillKind,
  GeneratedAtomT,
  GeneratedMapNodeT,
  GeneratedMapT,
  LearningNodeT,
  MapQuestionT,
  MapShapeT,
  ProfileT,
  TopicContentSettingsT,
  TopicT,
  VerdictT,
} from "@interestled/schemas";
import { generateJson } from "./json";
import {
  atomsPrompt,
  cardPrompt,
  drillPrompt,
  mapPrompt,
  mapQuestionsPrompt,
  questionPrompt,
  subtreePrompt,
  SYSTEM,
  verdictPrompt,
} from "./prompts";
import type { LlmProvider } from "./types";

/** Drill fields the model supplies; ids and timestamps are assigned server-side. */
export const GeneratedDrill = z.object({
  prompt: z.string().min(1).max(1000),
  completionTest: z.string().min(1).max(300),
  referencePoints: z.array(z.string().min(1).max(300)).min(1).max(8),
  hints: z.array(z.string().min(1).max(300)).max(3),
});

export type GeneratedDrillT = z.infer<typeof GeneratedDrill>;

const AtomList = z.object({ atoms: z.array(GeneratedAtom).min(1).max(6) });

/**
 * What the map-shaped calls may spend, thinking included.
 *
 * The map is the product's spine, so it was always the call worth more tokens.
 * The number moved when the map moved onto a reasoning model: Gemini 3 Pro
 * cannot be told not to think, and its thinking is spent from this same
 * allowance — a budget sized for the reply alone gets eaten by the reasoning and
 * returns MAX_TOKENS with half a document, or with nothing at all. Comfortably
 * under the 64k a Gemini 3 model will emit, because the cost of being wrong here
 * is a generation that fails rather than tokens actually spent: nothing bills
 * for headroom the model does not use.
 */
const MAP_OUTPUT_TOKENS = 32768;

export interface MapInput {
  title: string;
  goal: string;
  level: string;
  /** The counts the schema will hold the reply to. */
  shape: MapShapeT;
  /** The learner's instruction lines, seeded from that shape and then theirs. */
  mapInstructions: string;
  profile: ProfileT;
  /** How this topic is written: register, standing instructions, and node length. */
  content: TopicContentSettingsT;
  /** The seven answers, resolved. Empty when the learner skipped every one. */
  answered: readonly AnsweredQuestionT[];
}

const QuestionList = z.object({ questions: MapQuestionSet });

export interface MapQuestionsInput {
  title: string;
  goal: string;
  level: string;
  profile: ProfileT;
  content: TopicContentSettingsT;
  /** The instruction lines, so the options fit the map actually being asked for. */
  mapInstructions: string;
}

/**
 * The seven questions, generated from the same answers the map would have been
 * generated from.
 *
 * A little hotter than the rest, because four options that are really the same
 * option is the one way this call is useless, and the default 0.3 is tuned for a
 * map that should come out the same twice. Only a little: this is also the
 * strictest schema in the app — seven named kinds, four options each — and
 * sampling noise costs a whole retry when it drifts off that. The differences
 * between the four options are the prompt's job, not the temperature's.
 */
export async function generateMapQuestions(
  provider: LlmProvider,
  input: MapQuestionsInput,
): Promise<MapQuestionT[]> {
  const result = await generateJson(provider, {
    system: SYSTEM,
    prompt: mapQuestionsPrompt(input),
    schema: QuestionList,
    temperature: 0.4,
    // Twenty-eight samples is more text than a map, and it runs on the map's
    // model, so it gets the map's allowance.
    maxOutputTokens: MAP_OUTPUT_TOKENS,
  });
  return result.questions;
}

/**
 * The map: headings, and the nodes under each. One shape rather than two — the
 * heading counts say how wide and how many, which is what the level count used
 * to be gesturing at, and a schema per level count was a second place for the
 * same question to be answered differently.
 */
export async function generateMap(provider: LlmProvider, input: MapInput): Promise<GeneratedMapT> {
  return flattenTwoLevelMap(
    await generateJson(provider, {
      system: SYSTEM,
      prompt: mapPrompt(input),
      schema: GeneratedTwoLevelMap,
      maxOutputTokens: MAP_OUTPUT_TOKENS,
    }),
  );
}

export interface SubtreeInput {
  topic: TopicT;
  /** Top-level title first, ending with the group being rebuilt. */
  trail: readonly string[];
  claim: string;
  siblingTitles: readonly string[];
  profile: ProfileT;
  instructions: string;
}

/**
 * The nodes under one heading, rebuilt. Returned flat and relative to the
 * parent, with depths already set, so the caller only has to attach it. A map is
 * two levels, so what hangs under a heading is always nodes.
 */
export async function generateSubtree(
  provider: LlmProvider,
  input: SubtreeInput,
  parentKey: string,
  childDepth: number,
): Promise<GeneratedMapNodeT[]> {
  return flattenLeafChildren(
    await generateJson(provider, {
      system: SYSTEM,
      prompt: subtreePrompt(input),
      schema: GeneratedLeafChildren,
      maxOutputTokens: MAP_OUTPUT_TOKENS,
    }),
    parentKey,
    childDepth,
  );
}

/**
 * One card. `nodes` is the whole map: the prompt puts the node in its place in
 * it, which is what stops every card opening by re-explaining the three before
 * it (see mapOutline in ./outline).
 */
export function generateCard(
  provider: LlmProvider,
  input: {
    topic: TopicT;
    node: LearningNodeT;
    nodes: readonly LearningNodeT[];
    settings: CardSettingsT;
    profile: ProfileT;
  },
): Promise<CardContentT> {
  return generateJson(provider, {
    system: SYSTEM,
    prompt: cardPrompt(input),
    schema: CardContent,
  });
}

/**
 * One answer to one question asked on a card. Never cached: a question is asked
 * in the learner's own words, and the same words twice are the learner asking
 * again, which is a new answer. What is kept is the row the route writes.
 */
export function generateAnswer(
  provider: LlmProvider,
  input: {
    topic: TopicT;
    node: LearningNodeT;
    nodes: readonly LearningNodeT[];
    card: CardContentT;
    settings: CardSettingsT;
    question: string;
    earlier: readonly CardQuestionT[];
    profile: ProfileT;
  },
): Promise<CardAnswerT> {
  return generateJson(provider, {
    system: SYSTEM,
    prompt: questionPrompt(input),
    schema: CardAnswer,
  });
}

export function generateDrill(
  provider: LlmProvider,
  input: { node: LearningNodeT; kind: DrillKind; card: CardContentT; content: TopicContentSettingsT },
): Promise<GeneratedDrillT> {
  return generateJson(provider, {
    system: SYSTEM,
    prompt: drillPrompt(input),
    schema: GeneratedDrill,
  });
}

/**
 * The one call that must be live and good: grading is what turns a written
 * answer into the got/vague/missing/wrong diff, and a cached verdict would be
 * a verdict on somebody else's answer.
 *
 * It is also the one call the topic's content instructions do not reach — see
 * DEFAULT_CONTENT_INSTRUCTIONS in ./prompts.
 */
export function gradeAttempt(
  provider: LlmProvider,
  input: { prompt: string; referencePoints: readonly string[]; response: string },
): Promise<VerdictT> {
  return generateJson(provider, {
    system: SYSTEM,
    prompt: verdictPrompt(input),
    schema: Verdict,
    // Grading must not drift between two runs of the same answer.
    temperature: 0,
  });
}

export async function generateAtoms(
  provider: LlmProvider,
  input: { node: LearningNodeT; card: CardContentT; content: TopicContentSettingsT },
): Promise<GeneratedAtomT[]> {
  const result = await generateJson(provider, {
    system: SYSTEM,
    prompt: atomsPrompt(input),
    schema: AtomList,
  });
  return result.atoms;
}
