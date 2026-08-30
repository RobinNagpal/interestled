import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ReactElement } from "react";

/**
 * Tap a term, get its meaning in place. This is what lets a card be written
 * slightly above the reader's level instead of down to it — and it avoids the
 * trip to a glossary, which costs the thread every time.
 */
export function JargonList({
  terms,
}: {
  terms: readonly { term: string; gloss: string }[];
}): ReactElement | null {
  const [open, setOpen] = useState<string | null>(null);
  if (terms.length === 0) {
    return null;
  }
  return (
    <View className="flex-row flex-wrap gap-2">
      {terms.map((entry) => (
        <View key={entry.term}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpen(open === entry.term ? null : entry.term)}
            className="rounded-full bg-surface-sunken px-3 py-1"
          >
            <Text className="text-xs text-ink-soft">{entry.term}</Text>
          </Pressable>
          {open === entry.term ? (
            <Text className="mt-1 max-w-64 text-xs text-ink-soft">{entry.gloss}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
