import { Platform, TextInput } from "react-native";
import type { ComponentProps, ReactElement, RefAttributes } from "react";
import { cn } from "./utils";

/** Vendored from react-native-reusables — see the note in `text.tsx`. */
export type InputProps = ComponentProps<typeof TextInput> & RefAttributes<TextInput>;

export function Input({ className, ...props }: InputProps): ReactElement {
  return (
    <TextInput
      className={cn(
        "border-input bg-background text-foreground flex min-h-12 w-full min-w-0 flex-row items-center rounded-card border px-3 py-3 text-base",
        props.editable === false &&
          cn("opacity-50", Platform.select({ web: "disabled:pointer-events-none disabled:cursor-not-allowed" })),
        // The placeholder is `ink-faint` rather than the library's
        // `muted-foreground`, which here is the colour of ordinary body text: a
        // placeholder that reads as a value is a field the learner has to click
        // into to find out whether they already answered it.
        Platform.select({
          web: cn(
            "placeholder:text-ink-faint selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow]",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          ),
          native: "placeholder:text-ink-faint",
        }),
        className,
      )}
      {...props}
    />
  );
}
