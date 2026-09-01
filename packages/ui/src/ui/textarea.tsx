import { Platform, TextInput } from "react-native";
import type { ComponentProps, ReactElement, RefAttributes } from "react";
import { cn } from "./utils";

/** Vendored from react-native-reusables — see the note in `text.tsx`. */
export type TextareaProps = ComponentProps<typeof TextInput> & RefAttributes<TextInput>;

export function Textarea({
  className,
  multiline = true,
  // On web this is the initial height; on native it is the maximum.
  numberOfLines = Platform.select({ web: 4, native: 8 }),
  ...props
}: TextareaProps): ReactElement {
  return (
    <TextInput
      className={cn(
        "text-foreground border-input bg-background flex min-h-32 w-full flex-row rounded-card border px-3 py-3 text-base",
        // The placeholder is `ink-faint` rather than the library's
        // `muted-foreground`, which here is the colour of ordinary body text: a
        // placeholder that reads as a value is a field the learner has to click
        // into to find out whether they already answered it.
        Platform.select({
          web: cn(
            "placeholder:text-ink-faint focus-visible:border-ring focus-visible:ring-ring/50 resize-y outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed",
          ),
          native: "placeholder:text-ink-faint",
        }),
        props.editable === false && "opacity-50",
        className,
      )}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}
