import { Text, View } from "react-native";
import type { ReactElement, ReactNode } from "react";

export function Card({ children }: { children: ReactNode }): ReactElement {
  return <View className="gap-3 rounded-card bg-surface p-4">{children}</View>;
}

/** A stated seam between ideas, so the first can be banked before the next loads. */
export function SectionTitle({ children }: { children: string }): ReactElement {
  return <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{children}</Text>;
}

/** Honest minute estimate. People start things they can finish. */
export function Minutes({ value }: { value: number }): ReactElement {
  return <Text className="text-xs text-ink-faint">{value} min</Text>;
}
