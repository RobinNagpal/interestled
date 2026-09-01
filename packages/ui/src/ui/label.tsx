import { Platform } from "react-native";
import type { ComponentProps, ReactElement } from "react";
import * as LabelPrimitive from "@rn-primitives/label";
import { cn } from "./utils";

/**
 * Vendored from react-native-reusables — see the note in `text.tsx`.
 *
 * The primitive is what makes the label a target for the field it names: on the
 * web it emits a real `<label for>`, so tapping the word focuses the box. A
 * plain `<Text>` above an input looks identical and does none of that.
 */
export type LabelProps = ComponentProps<typeof LabelPrimitive.Text> & {
  disabled?: boolean;
  onPress?: ComponentProps<typeof LabelPrimitive.Root>["onPress"];
};

export function Label({ className, onPress, disabled, ...props }: LabelProps): ReactElement {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex select-none flex-row items-center gap-2",
        Platform.select({ web: "cursor-default leading-none" }),
        disabled === true && "opacity-50",
      )}
      onPress={onPress}
      disabled={disabled}
    >
      <LabelPrimitive.Text
        className={cn("text-muted-foreground text-sm font-medium", className)}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}
