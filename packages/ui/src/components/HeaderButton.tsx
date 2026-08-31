import { Pressable, Text } from "react-native";
import type { ReactElement } from "react";

/**
 * One action in the top bar. Written here rather than left to the navigator's
 * default back arrow because a screen opened from a link has no stack to go
 * back through, and a bar whose left side is sometimes empty reads as a
 * different screen each time.
 */
export function HeaderButton({
  label,
  onPress,
  accessibilityLabel,
  tone = "normal",
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  tone?: "normal" | "danger";
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      // 44pt of touchable height: the bar is the one place a mis-tap costs the
      // whole screen you were on.
      className="min-h-11 justify-center px-2"
    >
      <Text className={`text-base ${tone === "danger" ? "text-warn" : "text-accent"}`}>{label}</Text>
    </Pressable>
  );
}
