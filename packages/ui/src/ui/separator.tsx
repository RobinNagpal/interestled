import type { ComponentProps, ReactElement } from "react";
import * as SeparatorPrimitive from "@rn-primitives/separator";
import { cn } from "./utils";

/** Vendored from react-native-reusables — see the note in `text.tsx`. */
export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>): ReactElement {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className,
      )}
      {...props}
    />
  );
}
