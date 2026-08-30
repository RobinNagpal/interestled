import { z } from "zod";
import { CardContent, GeneratedAtom, GeneratedMap, Verdict } from "@interestled/schemas";
import type {
  CardContentT,
  DrillKind,
  GeneratedAtomT,
  GeneratedMapT,
  LearningNodeT,
  TopicT,
  VerdictT,
} from "@interestled/schemas";
import { generateJson } from "./json";
import { atomsPrompt, cardPrompt, drillPrompt, mapPrompt, SYSTEM, verdictPrompt } from "./prompts";
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

export function generateMap(
  provider: LlmProvider,
  input: { title: string; goal: string; timeBudget: string; knownDomains: readonly string[] },
): Promise<GeneratedMapT> {
  return generateJson(provider, {
    system: SYSTEM,
    prompt: mapPrompt(input),
    schema: GeneratedMap,
    // The map is the product's spine, so it is the one call worth more tokens.
    maxOutputTokens: 8192,
  });
}

export function generateCard(
  provider: LlmProvider,
  input: { topic: TopicT; node: LearningNodeT; depth: number; variant: string },
): Promise<CardContentT> {
  return generateJson(provider, {
    system: SYSTEM,
    prompt: cardPrompt(input),
    schema: CardContent,
  });
}

export function generateDrill(
  provider: LlmProvider,
  input: { node: LearningNodeT; kind: DrillKind; card: CardContentT },
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
  input: { node: LearningNodeT; card: CardContentT },
): Promise<GeneratedAtomT[]> {
  const result = await generateJson(provider, {
    system: SYSTEM,
    prompt: atomsPrompt(input),
    schema: AtomList,
  });
  return result.atoms;
}
