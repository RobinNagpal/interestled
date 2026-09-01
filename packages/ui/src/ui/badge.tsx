import { View } from "react-native";
import type { ComponentProps, ReactElement, RefAttributes } from "react";
import { Slot } from "@rn-primitives/slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { TextClassContext } from "./text";
import { cn } from "./utils";

/** Vendored from react-native-reusables — see the note in `text.tsx`. */
const badgeVariants = cva(
  "border-border group shrink-0 flex-row items-center justify-center gap-1 overflow-hidden rounded-full border px-3 py-1",
  {
    variants: {
      variant: {
        default: "bg-primary border-transparent",
        secondary: "bg-secondary border-transparent",
        destructive: "bg-destructive border-transparent",
        outline: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const badgeTextVariants = cva("text-xs font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export type BadgeProps = ComponentProps<typeof View> &
  RefAttributes<View> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

export function Badge({ className, variant, asChild = false, ...props }: BadgeProps): ReactElement {
  const Component = asChild ? Slot : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { badgeTextVariants, badgeVariants };
