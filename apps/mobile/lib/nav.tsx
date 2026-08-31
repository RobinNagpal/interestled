import type { ReactElement } from "react";
import { router } from "expo-router";
import { HeaderButton } from "@interestled/ui";

/**
 * Back, with somewhere to go when there is no stack. Every URL in the product is
 * shareable and openable cold, so "go back" has to mean "up one level" rather
 * than "undo the last push" — a bar whose left side does nothing on a fresh load
 * is worse than no bar at all.
 */
export function goBack(fallback: string): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

/** The left side of the top bar, for a screen whose parent is `fallback`. */
export function backHeader(fallback: string): () => ReactElement {
  return function BackHeader(): ReactElement {
    return <HeaderButton label="‹ Back" accessibilityLabel="Go back" onPress={() => goBack(fallback)} />;
  };
}
