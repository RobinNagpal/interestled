import { Text, View } from "react-native";
import type { ReactElement } from "react";
import { NodeStatus } from "@interestled/schemas";

/**
 * The status dots are the progress bar. Nothing here can be advanced by
 * scrolling — an indicator that moves on consumption teaches the learner that
 * none of the signals mean anything.
 */
const LOOK: Record<NodeStatus, { dot: string; label: string }> = {
  [NodeStatus.Untouched]: { dot: "border-2 border-ink-faint", label: "Not started" },
  [NodeStatus.Seen]: { dot: "border-2 border-accent", label: "Read" },
  [NodeStatus.Explained]: { dot: "bg-accent/70", label: "Explained" },
  [NodeStatus.Verified]: { dot: "bg-good", label: "Can do it" },
  // Filled *and* ringed. Bare accent-soft is a pale wash that a white row swallows
  // whole, which left the one status that is asking for attention invisible.
  [NodeStatus.Due]: { dot: "border-2 border-accent bg-accent-soft", label: "Due" },
  [NodeStatus.Shaky]: { dot: "bg-warn", label: "Needs another look" },
};

export function NodeStatusDot({ status }: { status: NodeStatus }): ReactElement {
  return <View className={`h-3 w-3 rounded-full ${LOOK[status].dot}`} />;
}

export function NodeStatusLabel({ status }: { status: NodeStatus }): ReactElement {
  return <Text className="text-xs text-ink-faint">{LOOK[status].label}</Text>;
}

export function statusLabel(status: NodeStatus): string {
  return LOOK[status].label;
}
