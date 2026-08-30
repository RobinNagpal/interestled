import { DrillKind, NodeStatus, TopicArchetype } from "@interestled/schemas";
import type { LearningNodeT } from "@interestled/schemas";
import { isEarned } from "./progress";

/** Screen shapes the composer rotates between. Two in a row is a bug. */
export enum StepKind {
  Card = "card",
  Predict = "predict",
  ExplainBack = "explain_back",
  Apply = "apply",
  Review = "review",
}

export interface Step {
  kind: StepKind;
  nodeId: string;
  minutes: number;
}

/** Which drill an archetype uses to decide a node is genuinely known. */
export function masteryDrill(archetype: TopicArchetype): DrillKind {
  switch (archetype) {
    case TopicArchetype.System:
      return DrillKind.Predict;
    case TopicArchetype.Tool:
    case TopicArchetype.Skill:
      return DrillKind.Apply;
    case TopicArchetype.Story:
    case TopicArchetype.SelfHelp:
      return DrillKind.ExplainBack;
  }
}

/**
 * The next node to offer. Shaky first (forgetting is visible work), then the
 * lowest-order untouched node. Prerequisites are never enforced — they are a
 * note on the node, so a learner who jumps ahead is not blocked (A4).
 */
export function nextNode(nodes: readonly LearningNodeT[]): LearningNodeT | null {
  const ordered = [...nodes].sort((a, b) => a.orderIndex - b.orderIndex);
  return (
    ordered.find((node) => node.status === NodeStatus.Shaky) ??
    ordered.find((node) => !isEarned(node.status)) ??
    null
  );
}

/** Prerequisites not yet earned. Shown as a note with a link, never as a gate. */
export function missingPrerequisites(
  node: LearningNodeT,
  nodes: readonly LearningNodeT[],
): LearningNodeT[] {
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  return node.prerequisiteIds
    .map((id) => byId.get(id))
    .filter((candidate): candidate is LearningNodeT => candidate !== undefined && !isEarned(candidate.status));
}

const MAX_SAME_SHAPE = 2;

/**
 * Lay out a session inside a minute budget, never allowing three consecutive
 * screens of the same shape. Novelty is a supply of the thing attention runs
 * on, so a run of identical screens is treated as a fault (W5).
 */
export function composeSession(
  nodes: readonly LearningNodeT[],
  budgetMinutes: number,
  hasReviewDue: boolean,
): Step[] {
  const steps: Step[] = [];
  let spent = 0;
  if (hasReviewDue) {
    steps.push({ kind: StepKind.Review, nodeId: "", minutes: 2 });
    spent += 2;
  }
  const queue = [...nodes]
    .filter((node) => !isEarned(node.status))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  for (const node of queue) {
    const drill = masteryDrill(node.archetype);
    const shapes: StepKind[] = [
      StepKind.Predict,
      StepKind.Card,
      drill === DrillKind.Apply ? StepKind.Apply : StepKind.ExplainBack,
    ];
    for (const kind of shapes) {
      const minutes = kind === StepKind.Card ? node.minutes : 1;
      if (spent + minutes > budgetMinutes) {
        return steps;
      }
      if (runLength(steps, kind) >= MAX_SAME_SHAPE) {
        continue;
      }
      steps.push({ kind, nodeId: node.id, minutes });
      spent += minutes;
    }
  }
  return steps;
}

function runLength(steps: readonly Step[], kind: StepKind): number {
  let count = 0;
  for (let index = steps.length - 1; index >= 0 && steps[index]?.kind === kind; index -= 1) {
    count += 1;
  }
  return count;
}

/** "12 minutes, 4 nodes, and you'll be able to …" — stated before starting (W3). */
export function contractLine(steps: readonly Step[], nodes: readonly LearningNodeT[]): string {
  const minutes = steps.reduce((sum, step) => sum + step.minutes, 0);
  const nodeIds = new Set(steps.map((step) => step.nodeId).filter((id) => id !== ""));
  const first = nodes.find((node) => nodeIds.has(node.id));
  const count = nodeIds.size;
  const noun = count === 1 ? "1 node" : `${count} nodes`;
  return first === undefined
    ? `${minutes} minutes of review.`
    : `${minutes} minutes, ${noun}, and you'll be able to ${lowerFirst(first.capability)}`;
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : text[0]!.toLowerCase() + text.slice(1);
}
