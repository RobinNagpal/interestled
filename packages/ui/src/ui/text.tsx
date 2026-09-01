import { createContext, useContext } from "react";
import { Platform, Text as RNText } from "react-native";
import type { ComponentProps, ReactElement, RefAttributes } from "react";
import type { Role } from "react-native";
import { Slot } from "@rn-primitives/slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "./utils";

/**
 * Vendored from react-native-reusables (the NativeWind registry), themed by the
 * token names in `packages/config/tailwind-preset.js`. Two edits run through
 * every file in this folder: the `dark:` variants are dropped, because the app
 * is locked to `userInterfaceStyle: "light"` and a dark class with no dark
 * palette behind it is a claim the app cannot honour; and shadcn's `accent`
 * — a faint wash for pressed states — is written `accent-tint`, because here
 * `accent` is the blue.
 *
 * `TextClassContext` is what makes the rest of the set work: a Button decides
 * the colour of the label inside it without the caller having to pass one, so
 * `<Button variant="destructive"><Text>Delete</Text></Button>` cannot end up
 * with dark text on a dark fill.
 */
const textVariants = cva(cn("text-foreground text-base", Platform.select({ web: "select-text" })), {
  variants: {
    variant: {
      default: "",
      h1: "text-3xl font-bold tracking-tight",
      h2: "text-2xl font-semibold tracking-tight",
      h3: "text-xl font-semibold tracking-tight",
      h4: "text-lg font-semibold tracking-tight",
      p: "leading-7",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

type TextVariantProps = VariantProps<typeof textVariants>;
type TextVariant = NonNullable<TextVariantProps["variant"]>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = { h1: "1", h2: "2", h3: "3", h4: "4" };

export const TextClassContext = createContext<string | undefined>(undefined);

export type TextProps = ComponentProps<typeof RNText> &
  RefAttributes<RNText> &
  TextVariantProps & { asChild?: boolean };

export function Text({
  className,
  asChild = false,
  variant = "default",
  ...props
}: TextProps): ReactElement {
  const inherited = useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), inherited, className)}
      role={variant === null ? undefined : ROLE[variant]}
      aria-level={variant === null ? undefined : ARIA_LEVEL[variant]}
      {...props}
    />
  );
}

export { textVariants };
