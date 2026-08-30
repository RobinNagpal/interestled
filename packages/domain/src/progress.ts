import { NodeStatus, VerdictLabel } from "@learnloop/schemas";
import type { LearningNodeT, VerdictT } from "@learnloop/schemas";

/** Statuses that mean the learner has demonstrated something, not read something. */
const EARNED: readonly NodeStatus[] = [NodeStatus.Explained, NodeStatus.Verified, NodeStatus.Due];

export function isEarned(status: NodeStatus): boolean {
  return EARNED.includes(status);
}

/**
 * Where a node moves after an attempt. Reading only ever reaches Seen — the
 * jump to Explained needs a passed explain-back, and Verified needs the idea
 * used on a case it has not been used on.
 */
export function advance(current: NodeStatus, verdict: VerdictT, isApplication: boolean): NodeStatus {
  if (!verdict.passed) {
    // A failure never drops an earned node below Shaky: the work still happened,
    // and wiping it is the mechanic that loses people (A9).
    return isEarned(current) || current === NodeStatus.Shaky ? NodeStatus.Shaky : NodeStatus.Seen;
  }
  if (isApplication) {
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

export function summarise(nodes: readonly LearningNodeT[]): Progress {
  const earned = nodes.filter((node) => isEarned(node.status));
  return {
    total: nodes.length,
    earned: earned.length,
    shaky: nodes.filter((node) => node.status === NodeStatus.Shaky).length,
    capabilities: earned.map((node) => node.capability),
    remainingMinutes: nodes
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
