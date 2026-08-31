import { NodeStatus, VerdictLabel } from "@interestled/schemas";
import type { LearningNodeT, VerdictT } from "@interestled/schemas";
import { leafNodes } from "./tree";

/** Statuses that mean the learner has demonstrated something, not read something. */
const EARNED: readonly NodeStatus[] = [NodeStatus.Explained, NodeStatus.Verified, NodeStatus.Due];

export function isEarned(status: NodeStatus): boolean {
  return EARNED.includes(status);
}

export interface AdvanceOptions {
  /**
   * Whether this drill is the one that decides "known" for this topic's
   * archetype. Hardcoding "an apply drill" here left System, Story and
   * Self-help topics unable to ever reach Verified, because their mastery
   * drills are Predict and ExplainBack.
   */
  isMastery: boolean;
  /**
   * Whether a failure may move the node down. False for Predict: a guess made
   * before the reveal is a learning device, not an assessment, and penalising
   * it is the thing that stops people guessing honestly (W14).
   */
  penalise: boolean;
}

/**
 * Where a node moves after an attempt. Reading only ever reaches Seen — the
 * jump to Explained needs a passed explain-back, and Verified needs the drill
 * that defines mastery for this archetype.
 */
export function advance(
  current: NodeStatus,
  verdict: VerdictT,
  options: AdvanceOptions,
): NodeStatus {
  if (!verdict.passed) {
    if (!options.penalise) {
      return current === NodeStatus.Untouched ? NodeStatus.Seen : current;
    }
    // A failure never drops an earned node below Shaky: the work still happened,
    // and wiping it is the mechanic that loses people (A9).
    return isEarned(current) || current === NodeStatus.Shaky ? NodeStatus.Shaky : NodeStatus.Seen;
  }
  if (options.isMastery) {
    return NodeStatus.Verified;
  }
  return current === NodeStatus.Verified ? NodeStatus.Verified : NodeStatus.Explained;
}

/** A failed review item reopens its node, so forgetting becomes visible work. */
export function afterLapse(current: NodeStatus): NodeStatus {
  return current === NodeStatus.Untouched ? NodeStatus.Untouched : NodeStatus.Shaky;
}

export interface Progress {
  total: number;
  earned: number;
  shaky: number;
  /** What they can now do. This is the progress statement; the counts support it. */
  capabilities: string[];
  remainingMinutes: number;
}

/**
 * Takes the whole map and counts only its leaves. A branch is a heading — it has
 * no card and no drill, so counting one would inflate the total with rows nobody
 * can ever complete, and a total that cannot reach its own maximum is exactly
 * the lying map ideal 1 forbids.
 */
export function summarise(nodes: readonly LearningNodeT[]): Progress {
  const leaves = leafNodes(nodes);
  const earned = leaves.filter((node) => isEarned(node.status));
  return {
    total: leaves.length,
    earned: earned.length,
    shaky: leaves.filter((node) => node.status === NodeStatus.Shaky).length,
    capabilities: earned.map((node) => node.capability),
    remainingMinutes: leaves
      .filter((node) => !isEarned(node.status))
      .reduce((sum, node) => sum + node.minutes, 0),
  };
}

/** Verdict items worth showing first: what they got, then what was missing. */
export function orderVerdict(verdict: VerdictT): VerdictT["items"] {
  const rank: Record<VerdictLabel, number> = {
    [VerdictLabel.Got]: 0,
    [VerdictLabel.Vague]: 1,
    [VerdictLabel.Missing]: 2,
    [VerdictLabel.Wrong]: 3,
  };
  return [...verdict.items].sort((a, b) => rank[a.label] - rank[b.label]);
}
