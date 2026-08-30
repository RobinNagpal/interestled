import { Text, TextInput, View } from "react-native";
import type { ReactElement } from "react";

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  autoFocus = false,
  keyboardType = "default",
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  autoFocus?: boolean;
  keyboardType?: "default" | "email-address";
  hint?: string;
  maxLength?: number;
}): ReactElement {
  // Warn before the limit rather than at it, so a long answer is never lost.
  const nearLimit = maxLength !== undefined && value.length > maxLength * 0.9;
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink-soft">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        autoCorrect={keyboardType !== "email-address"}
        className={`rounded-card border border-ink-faint/40 bg-surface px-3 py-3 text-base text-ink ${multiline ? "min-h-32" : ""}`}
        style={multiline ? { textAlignVertical: "top" } : undefined}
      />
      {nearLimit ? (
        <Text className="text-xs text-warn">
          {value.length} of {maxLength} characters
        </Text>
      ) : null}
      {hint === undefined ? null : <Text className="text-xs text-ink-faint">{hint}</Text>}
    </View>
  );
}
