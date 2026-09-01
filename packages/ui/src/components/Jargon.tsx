import { useState } from "react";
import { Pressable, View } from "react-native";
import type { ReactElement } from "react";
import { Badge } from "../ui/badge";
import { Text } from "../ui/text";
import { InlineMarkdown } from "./Markdown";

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
          <Badge asChild variant="secondary">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open === entry.term }}
              onPress={() => setOpen(open === entry.term ? null : entry.term)}
            >
              <Text className="text-xs text-ink-soft">{entry.term}</Text>
            </Pressable>
          </Badge>
          {open === entry.term ? (
            <InlineMarkdown text={entry.gloss} className="mt-1 max-w-64 text-xs text-ink-soft" />
          ) : null}
        </View>
      ))}
    </View>
  );
}
