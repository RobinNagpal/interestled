import { Platform, Pressable } from "react-native";
import type { ComponentProps, ReactElement, RefAttributes } from "react";
import type { View } from "react-native";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { TextClassContext } from "./text";
import { cn } from "./utils";

/** Vendored from react-native-reusables — see the note in `text.tsx`. */
const buttonVariants = cva(
  cn(
    "group shrink-0 flex-row items-center justify-center gap-2 rounded-card shadow-none",
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn("bg-primary active:bg-primary/90", Platform.select({ web: "hover:bg-primary/90" })),
        destructive: cn(
          "bg-destructive active:bg-destructive/90",
          Platform.select({ web: "hover:bg-destructive/90 focus-visible:ring-destructive/20" }),
        ),
        outline: cn(
          "border-border bg-background active:bg-accent-tint border",
          Platform.select({ web: "hover:bg-accent-tint" }),
        ),
        secondary: cn("bg-secondary active:bg-secondary/80", Platform.select({ web: "hover:bg-secondary/80" })),
        ghost: cn("active:bg-accent-tint", Platform.select({ web: "hover:bg-accent-tint" })),
        link: "",
      },
      size: {
        // 44pt is the floor everywhere rather than shadcn's 36: this is a phone
        // app read one-handed, and the web sizes are a desktop pointer's.
        default: "min-h-12 px-4 py-3",
        sm: "min-h-11 gap-1.5 px-3 py-2",
        lg: "min-h-14 px-6 py-4",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva(
  cn("text-base font-semibold", Platform.select({ web: "pointer-events-none transition-colors" })),
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: "text-foreground",
        secondary: "text-secondary-foreground",
        ghost: "text-foreground",
        link: cn("text-primary", Platform.select({ web: "underline-offset-4 hover:underline" })),
      },
      size: { default: "", sm: "text-sm", lg: "", icon: "" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ComponentProps<typeof Pressable> &
  RefAttributes<View> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps): ReactElement {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled === true && "opacity-50", buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { buttonTextVariants, buttonVariants };
