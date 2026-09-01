import { z } from "zod";
import {
  CardContent,
  GeneratedAtom,
  GeneratedLeafChildren,
  GeneratedSectionChildren,
  GeneratedThreeLevelMap,
  GeneratedTwoLevelMap,
  MapLevels,
  MapQuestionSet,
  Verdict,
  flattenLeafChildren,
  flattenSectionChildren,
  flattenThreeLevelMap,
  flattenTwoLevelMap,
} from "@interestled/schemas";
import type {
  CardContentT,
  CardSettingsT,
  ChosenOptionT,
  DrillKind,
  GeneratedAtomT,
  GeneratedMapNodeT,
  GeneratedMapT,
  LearningNodeT,
  MapQuestionT,
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

/** The map is the product's spine, so it is the one call worth more tokens. */
const MAP_OUTPUT_TOKENS = 8192;

export interface MapInput {
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
  /** The seven choices, resolved. Empty when the learner skipped every one. */
  chosen: readonly ChosenOptionT[];
}

const QuestionList = z.object({ questions: MapQuestionSet });

export interface MapQuestionsInput {
  title: string;
  goal: string;
  timeBudget: string;
  level: string;
  levels: MapLevels;
  profile: ProfileT;
  content: TopicContentSettingsT;
  instructions: string;
  /** The map being replaced, on a rebuild. Empty when the topic is new. */
  current: readonly LearningNodeT[];
}

/**
 * The seven questions, generated from the same answers the map would have been
 * generated from. It runs a little hotter than the rest: four options that are
 * really the same option is the one way this call fails, and the default 0.3 is
 * tuned for a map that should come out the same twice, which is the opposite of
 * what four alternatives need.
 */
export async function generateMapQuestions(
  provider: LlmProvider,
  input: MapQuestionsInput,
): Promise<MapQuestionT[]> {
  const result = await generateJson(provider, {
    system: SYSTEM,
    prompt: mapQuestionsPrompt(input),
    schema: QuestionList,
    temperature: 0.8,
    // Seven questions with four samples each is as much text as a small map.
    maxOutputTokens: MAP_OUTPUT_TOKENS,
  });
  return result.questions;
}

/**
 * The map, nested as deep as the learner asked for. The two level counts are
 * separate schemas rather than one recursive shape: a recursive schema would let
 * the model return four levels or one, and the whole point of the question on
 * the create screen is that the answer is honoured. Each is flattened into rows
 * here, so nothing downstream has to know which shape came back.
 */
export async function generateMap(provider: LlmProvider, input: MapInput): Promise<GeneratedMapT> {
  const prompt = mapPrompt(input);
  if (input.levels === MapLevels.Three) {
    return flattenThreeLevelMap(
      await generateJson(provider, {
        system: SYSTEM,
        prompt,
        schema: GeneratedThreeLevelMap,
        maxOutputTokens: MAP_OUTPUT_TOKENS,
      }),
    );
  }
  return flattenTwoLevelMap(
    await generateJson(provider, {
      system: SYSTEM,
      prompt,
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
  /** How many levels sit below this group: 1 for nodes, 2 for groups of nodes. */
  childLevels: number;
  profile: ProfileT;
  instructions: string;
}

/**
 * Everything under one group, rebuilt. Returned flat and relative to the parent,
 * with depths already set, so the caller only has to attach it.
 */
export async function generateSubtree(
  provider: LlmProvider,
  input: SubtreeInput,
  parentKey: string,
  childDepth: number,
): Promise<GeneratedMapNodeT[]> {
  const prompt = subtreePrompt(input);
  if (input.childLevels >= 2) {
    return flattenSectionChildren(
      await generateJson(provider, {
        system: SYSTEM,
        prompt,
        schema: GeneratedSectionChildren,
        maxOutputTokens: MAP_OUTPUT_TOKENS,
      }),
      parentKey,
      childDepth,
    );
  }
  return flattenLeafChildren(
    await generateJson(provider, {
      system: SYSTEM,
      prompt,
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
