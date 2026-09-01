import { View } from "react-native";
import type { ComponentProps, ReactElement, RefAttributes } from "react";
import { cn } from "./utils";

/**
 * Vendored from react-native-reusables — see the note in `text.tsx`.
 *
 * One edit beyond the two in that note: RNR fills the bar with `bg-accent`,
 * which under shadcn's names is a faint wash and under ours is the blue. It is
 * `bg-ink-faint/25` here, a tint of the text it stands in for — the sunken
 * surface it would otherwise pick up *is* the page background, which drew the
 * skeleton in the colour of the thing behind it.
 */
export function Skeleton({
  className,
  ...props
}: ComponentProps<typeof View> & RefAttributes<View>): ReactElement {
  return <View className={cn("bg-ink-faint/25 animate-pulse rounded", className)} {...props} />;
}
