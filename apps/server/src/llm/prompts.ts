import { DepthAction, DrillKind } from "@interestled/schemas";
import type { CardContentT, LearningNodeT, TopicT } from "@interestled/schemas";

/**
 * Rules that hold for every generation. These are the design documents in
 * docs/ux compressed to what a model can follow — mostly caps and bans, because
 * an uninstructed model writes 900 words of preamble by default.
 */
export const SYSTEM = `You write material for a learning app used by people who lose interest fast, including people with ADHD.

Hard rules:
- Reply with JSON only. No prose outside the JSON, no code fences.
- No preamble. Never open with history, aims, "in this section", or why the topic matters.
- Lead with the point. The first sentence is the claim itself.
- Plain words. Short sentences. Cut every recap, transition and filler phrase.
- Be concrete: real numbers, real names, real commands. Never "various factors".
- Never invent a figure, a date, a command or a flag you are not sure of. If a
  specific number would be needed and you do not know it, write the sentence
  without it rather than guessing.
- Where experts genuinely disagree, say so in one clause instead of picking a side.
- Never use motivational or effort language: no "focus", "try harder", "you've got this".`;

export function mapPrompt(input: {
  title: string;
  goal: string;
  timeBudget: string;
  knownDomains: readonly string[];
}): string {
  const known =
    input.knownDomains.length === 0
      ? "They did not name anything they already use."
      : `They already use: ${input.knownDomains.join(", ")}. Do not create nodes for things these already cover, and draw comparisons from them.`;
  return `Build a knowledge map for: ${input.title}

What they want to be able to do: ${input.goal || "(not stated — infer the most common goal)"}
Time available: ${input.timeBudget}
${known}

Classify the topic into exactly one archetype:
- "system": interacting parts and quantities (robotics, an engine). Known = can predict behaviour.
- "story": causes and consequences over time (inflation history). Known = can explain why and argue it.
- "tool": objects, commands, workflows, failure modes (Kubernetes, Git). Known = can do it and fix it.
- "skill": automaticity through volume (a language, chess). Known = speed and accuracy under pressure.
- "self_help": a framework applied to your own situation (motivation). Known = a behaviour changed.

Then produce 8-24 nodes ordered so the most interesting one is first — an anomaly, a
live demo, or a result, never a definition or a setup step.

Each node:
- "key": short slug, unique, lowercase with underscores.
- "title": 2-6 words.
- "claim": ONE sentence answering "what is this, really?". Not a definition.
- "minutes": honest reading+doing time, 1-5. Nothing may exceed 5.
- "capability": what they can do once it is verified, starting with a verb
  ("read a manifest and say what it does"). This is how progress gets reported,
  so it must be checkable, not "understand X".
- "prerequisiteKeys": keys of nodes genuinely needed first, at most 3. These are
  advisory notes, never gates, so include only real dependencies.

Return JSON: {"archetype": "...", "nodes": [{"key","title","claim","minutes","capability","prerequisiteKeys"}]}`;
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

export function cardPrompt(input: {
  topic: TopicT;
  node: LearningNodeT;
  depth: number;
  variant: string;
}): string {
  const known =
    input.topic.knownDomains.length === 0
      ? ""
      : `\nDraw any analogy from things they already use: ${input.topic.knownDomains.join(", ")}.`;
  return `Topic: ${input.topic.title}
Node: ${input.node.title}
Its claim: ${input.node.claim}

${DEPTH_GUIDE[input.depth] ?? DEPTH_GUIDE[3]}
${VARIANT_GUIDE[input.variant] ?? ""}${known}

Write the card. Six slots, all required:
- "claim": one sentence. The answer, first, before any context.
- "mechanism": 1-5 short items explaining WHY it behaves this way. Not a definition,
  not a list of features. Each item under 40 words.
- "example": {"setup", "result"} — one concrete worked case with real values.
- "misconception": {"belief", "correction"} — what people actually get wrong here,
  stated as the plausible wrong belief, then what is true and why.
- "jargon": every technical term you used, each with a one-line meaning at this depth.
  Empty array if you used none.

Return JSON: {"claim","mechanism":[],"example":{"setup","result"},"misconception":{"belief","correction"},"jargon":[{"term","gloss"}]}`;
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
}): string {
  return `Node: ${input.node.title}
Claim: ${input.card.claim}
Mechanism: ${input.card.mechanism.join(" ")}
Common misconception: ${input.card.misconception.belief}

Write one drill of kind "${input.kind}".
${DRILL_GUIDE[input.kind]}

- "prompt": the task itself. Everything needed to answer must be IN the prompt —
  never refer to "the card above" or a value from a previous screen.
- "completionTest": one line stating what will exist when they are done.
- "referencePoints": 2-5 things a good answer contains, each one checkable. These
  are what the answer gets compared against, so make them specific and separable.
- "hints": exactly 3, escalating — a nudge, then a narrowing, then near-reveal.

Return JSON: {"prompt","completionTest","referencePoints":[],"hints":[]}`;
}

export function verdictPrompt(input: {
  prompt: string;
  referencePoints: readonly string[];
  response: string;
}): string {
  return `The learner was asked:
${input.prompt}

A good answer contains these points:
${input.referencePoints.map((point, index) => `${index + 1}. ${point}`).join("\n")}

Their answer:
"""
${input.response}
"""

Judge each reference point independently:
- "got": they stated it clearly.
- "vague": they gestured at it without saying the thing that matters. The note must
  name what is missing ("faster than what, and why?").
- "missing": absent.
- "wrong": they asserted something that contradicts it. The note gives the correction
  plus one concrete example, in under 40 words.

Rules:
- Judge the ANSWER, never the person. No score, no percentage, no praise, no criticism.
- Notes must be usable in the next ten seconds — a correction, not an assessment.
- "passed" is true when no point is "wrong" and at least half are "got".
- "misconception": if their answer reveals a specific wrong belief, state it in
  THEIR words in one short sentence. Otherwise empty string.
- Wording differences are not errors. A right idea said plainly is "got".

Return JSON: {"items":[{"label","point","note"}],"passed":true|false,"misconception":""}`;
}

export function atomsPrompt(input: { node: LearningNodeT; card: CardContentT }): string {
  return `Node: ${input.node.title}
Claim: ${input.card.claim}
Mechanism: ${input.card.mechanism.join(" ")}
Worked example: ${input.card.example.setup} → ${input.card.example.result}
Misconception: ${input.card.misconception.belief} (in fact: ${input.card.misconception.correction})

Extract 3-5 retrieval items for spaced review. Mix the kinds:
- "cloze": one sentence with the load-bearing words removed, written as "___".
- "reverse": a question whose answer is the name of the thing.
- "application": a symptom or situation, answered by what to do or check first.
- "production": something they must produce from scratch (a command, a sentence, a value).

Each must be answerable in under fifteen seconds and must stand alone — no
reference to "the card" or to another item. The answer must be short and specific.

Return JSON: {"atoms":[{"kind","prompt","answer"}]}`;
}
