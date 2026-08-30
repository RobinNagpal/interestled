import { ActivityIndicator, Pressable, Text } from "react-native";
import type { ReactElement } from "react";

export type ButtonTone = "primary" | "secondary" | "quiet";

const TONES: Record<ButtonTone, { box: string; label: string }> = {
  // One primary action per screen: a grid of equal options is where sessions end.
  primary: { box: "bg-accent", label: "text-white" },
  secondary: { box: "bg-surface-sunken border border-ink-faint/40", label: "text-ink" },
  quiet: { box: "bg-transparent", label: "text-ink-soft underline" },
};

export function Button({
  label,
  onPress,
  tone = "primary",
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  busy?: boolean;
  disabled?: boolean;
}): ReactElement {
  const style = TONES[tone];
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center rounded-card px-4 py-3 ${style.box} ${off ? "opacity-50" : ""}`}
    >
      {busy ? (
        <ActivityIndicator color={tone === "primary" ? "#ffffff" : "#4b5563"} />
      ) : (
        <Text className={`text-base font-semibold ${style.label}`}>{label}</Text>
      )}
    </Pressable>
  );
}
