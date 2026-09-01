import { ActivityIndicator } from "react-native";
import type { ReactElement } from "react";
import { Button as BaseButton } from "../ui/button";
import type { ButtonProps } from "../ui/button";
import { Text } from "../ui/text";

export type ButtonTone = "primary" | "secondary" | "quiet";

/**
 * The tones are the product's vocabulary; the variants underneath are
 * react-native-reusables'. Keeping the tone names is what stops a screen
 * reaching for `destructive` because it was in the list — one primary action
 * per screen, and a grid of equal options is where sessions end.
 */
const TONES: Record<ButtonTone, { variant: NonNullable<ButtonProps["variant"]>; box: string; label: string }> = {
  primary: { variant: "default", box: "", label: "" },
  // The palette is a shade apart on purpose (A13), and a grey fill on a grey
  // page needs an edge or the button has no boundary at all.
  secondary: { variant: "secondary", box: "border border-line-strong", label: "" },
  quiet: { variant: "link", box: "", label: "text-ink-soft underline" },
};

const SPINNER: Record<ButtonTone, string> = {
  primary: "#ffffff",
  secondary: "#4b5563",
  quiet: "#4b5563",
};

/**
 * `label` and `busy` are the two things every button here needs and the base
 * component has no opinion about: the label so a caller cannot forget the Text
 * that carries the tone's colour, and `busy` so a generation that takes twenty
 * seconds says so on the control that started it.
 *
 * Everything else is the base component's — pass `size`, `className` or any
 * Pressable prop straight through.
 */
export function Button({
  label,
  onPress,
  tone = "primary",
  busy = false,
  disabled = false,
  className,
  ...props
}: Omit<ButtonProps, "variant" | "children"> & {
  label: string;
  tone?: ButtonTone;
  busy?: boolean;
}): ReactElement {
  const look = TONES[tone];
  const off = disabled || busy;
  return (
    <BaseButton
      variant={look.variant}
      onPress={onPress}
      disabled={off}
      className={`${look.box} ${className ?? ""}`}
      {...props}
    >
      {busy ? (
        <ActivityIndicator color={SPINNER[tone]} />
      ) : (
        <Text className={look.label}>{label}</Text>
      )}
    </BaseButton>
  );
}
