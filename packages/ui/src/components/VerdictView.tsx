import { View } from "react-native";
import type { ReactElement } from "react";
import { VerdictLabel } from "@interestled/schemas";
import type { VerdictItemT } from "@interestled/schemas";
import { Text } from "../ui/text";
import { Markdown } from "./Markdown";

/**
 * The got/vague/missing/wrong diff. No score and no percentage: a number invites
 * self-evaluation, which is the category of feedback most likely to make things
 * worse. Right answers come first so the rest gets read.
 */
const MARK: Record<VerdictLabel, { glyph: string; tone: string; word: string }> = {
  [VerdictLabel.Got]: { glyph: "✓", tone: "text-good", word: "Got" },
  [VerdictLabel.Vague]: { glyph: "△", tone: "text-warn", word: "Vague" },
  [VerdictLabel.Missing]: { glyph: "○", tone: "text-ink-soft", word: "Missing" },
  [VerdictLabel.Wrong]: { glyph: "✗", tone: "text-warn", word: "Not quite" },
};

export function VerdictView({ items }: { items: readonly VerdictItemT[] }): ReactElement {
  return (
    <View className="gap-3">
      {items.map((item, index) => {
        const mark = MARK[item.label];
        return (
          <View key={index} className="flex-row gap-3">
            <Text className={`text-base font-semibold ${mark.tone}`}>{mark.glyph}</Text>
            <View className="flex-1 gap-1">
              <Markdown text={item.point} className="text-base text-ink" />
              {item.note === "" ? null : (
                <Markdown text={item.note} className="text-sm text-ink-soft" />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
