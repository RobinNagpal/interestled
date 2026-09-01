import { View } from "react-native";
import type { ReactElement } from "react";
import { Input as BaseInput } from "../ui/input";
import { Label } from "../ui/label";
import { Text } from "../ui/text";
import { Textarea } from "../ui/textarea";

/**
 * A field is never a bare box here: it carries its own label, and a long answer
 * carries a count. Both are the reason this wraps react-native-reusables' Input
 * rather than the screens using it directly — a placeholder standing in for a
 * label disappears the moment typing starts, which is exactly when a reader who
 * has lost the thread needs to see what the box was for.
 */
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
  const Field = multiline ? Textarea : BaseInput;
  return (
    <View className="gap-1">
      <Label>{label}</Label>
      <Field
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        autoCorrect={keyboardType !== "email-address"}
      />
      {nearLimit ? (
        <Text variant="small" className="text-xs text-warn">
          {value.length} of {maxLength} characters
        </Text>
      ) : null}
      {hint === undefined ? null : (
        <Text variant="muted" className="text-xs text-ink-faint">
          {hint}
        </Text>
      )}
    </View>
  );
}
