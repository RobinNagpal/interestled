import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import type { ReactElement } from "react";
import { Card } from "../ui/card";
import { Skeleton as SkeletonBar } from "../ui/skeleton";
import { Text } from "../ui/text";

/**
 * A skeleton rather than a spinner wherever the shape is known: structure that
 * appears first is readable while the content arrives, and a blank wait is where
 * people switch tabs and do not come back.
 *
 * The bars are a tint of ink rather than the sunken surface — see the note on
 * `ui/skeleton.tsx` for why the library's own fill could not be kept.
 */
export function Skeleton({ lines = 3 }: { lines?: number }): ReactElement {
  return (
    <View className="gap-3">
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBar key={index} className="h-4" style={{ width: `${90 - index * 12}%` }} />
      ))}
    </View>
  );
}

/** Long enough that a cached screen never flashes it, short enough to arrive first. */
const SLOW_AFTER_MS = 1200;

/**
 * A wait with a name on it. Most of these resolve instantly from cache, but the
 * first open of a node is a live model call — twenty seconds of blank screen is
 * where the session ends, and A10 treats dead time as a fault rather than a
 * cost of doing business.
 *
 * The second line is held back until the wait is actually long: saying "this
 * takes 10-30 seconds" and then finishing in 200ms teaches the learner to
 * disbelieve the next estimate, and W3 only works while the estimates are true.
 */
export function LoadingContent({
  label,
  detail,
  hint,
  lines = 5,
}: {
  label: string;
  /**
   * What is being written. Shown at once rather than after the slow threshold,
   * because it is not an apology for the wait — it is what the wait produces.
   */
  detail?: string;
  hint?: string;
  lines?: number;
}): ReactElement {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="gap-4 p-4">
      <View className="flex-row items-center gap-3">
        <ActivityIndicator color="#2563eb" />
        <Text>{label}</Text>
      </View>
      {detail === undefined ? null : <Text variant="muted">{detail}</Text>}
      {slow && hint !== undefined ? <Text variant="muted">{hint}</Text> : null}
      <Skeleton lines={lines} />
    </View>
  );
}

export function LoadingState({ label }: { label?: string }): ReactElement {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <ActivityIndicator color="#2563eb" />
      {label === undefined ? null : <Text variant="muted">{label}</Text>}
    </View>
  );
}

export function ErrorState({ message, hint }: { message: string; hint?: string }): ReactElement {
  return (
    <Card className="gap-2 border border-warn/40 bg-warn/5">
      <Text>{message}</Text>
      {hint === undefined ? null : <Text variant="muted">{hint}</Text>}
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }): ReactElement {
  return (
    <View className="gap-2 p-6">
      <Text variant="h4">{title}</Text>
      <Text className="text-ink-soft">{body}</Text>
    </View>
  );
}
