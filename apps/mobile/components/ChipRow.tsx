import { Pressable, Text, View } from "react-native";
import type { ReactElement } from "react";

/** A small set of options with one always selected — never an empty state. */
export function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}): ReactElement {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onSelect(option.value)}
            className={`rounded-full px-4 py-2 ${active ? "bg-accent" : "bg-surface border border-ink-faint/40"}`}
          >
            <Text className={active ? "text-sm font-semibold text-white" : "text-sm text-ink-soft"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
