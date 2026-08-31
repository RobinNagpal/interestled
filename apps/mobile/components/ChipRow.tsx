import { Pressable, Text, View } from "react-native";
import type { ReactElement } from "react";

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${active ? "bg-accent" : "bg-surface border border-ink-faint/40"}`}
    >
      <Text className={active ? "text-sm font-semibold text-white" : "text-sm text-ink-soft"}>
        {label}
      </Text>
    </Pressable>
  );
}

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
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          active={option.value === selected}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </View>
  );
}

/**
 * The same chips, any number of them on, including none. Separate from ChipRow
 * rather than a mode flag on it: the two differ in what "selected" even means,
 * and a single-select row that can end up empty is a different component.
 */
export function ChipMultiRow<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly { value: T; label: string }[];
  selected: readonly T[];
  onToggle: (value: T) => void;
}): ReactElement {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          active={selected.includes(option.value)}
          onPress={() => onToggle(option.value)}
        />
      ))}
    </View>
  );
}
