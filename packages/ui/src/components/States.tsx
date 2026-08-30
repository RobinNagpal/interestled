import { ActivityIndicator, Text, View } from "react-native";
import type { ReactElement } from "react";

/**
 * A skeleton rather than a spinner wherever the shape is known: structure that
 * appears first is readable while the content arrives, and a blank wait is where
 * people switch tabs and do not come back.
 */
export function Skeleton({ lines = 3 }: { lines?: number }): ReactElement {
  return (
    <View className="gap-3 p-4">
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          className="h-4 rounded bg-surface-sunken"
          style={{ width: `${90 - index * 12}%` }}
        />
      ))}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }): ReactElement {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <ActivityIndicator color="#2563eb" />
      {label === undefined ? null : <Text className="text-sm text-ink-soft">{label}</Text>}
    </View>
  );
}

export function ErrorState({ message, hint }: { message: string; hint?: string }): ReactElement {
  return (
    <View className="gap-2 rounded-card border border-warn/40 bg-warn/5 p-4">
      <Text className="text-base text-ink">{message}</Text>
      {hint === undefined ? null : <Text className="text-sm text-ink-soft">{hint}</Text>}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }): ReactElement {
  return (
    <View className="gap-2 p-6">
      <Text className="text-lg font-semibold text-ink">{title}</Text>
      <Text className="text-base text-ink-soft">{body}</Text>
    </View>
  );
}
