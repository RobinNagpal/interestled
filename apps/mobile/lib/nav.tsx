import { useCallback } from "react";
import type { ReactElement } from "react";
import { BackHandler, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
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

/**
 * Android's own back button, answering exactly as the one in the bar does.
 *
 * Android hands the press to the app, and an app that does not take it exits —
 * which is what a screen opened with nothing under it does by default, and what
 * a learner reading a card sees as the app closing on them. Every URL here can
 * be opened cold, from a link or a notification or a restored session, so
 * "nothing under it" is an ordinary state rather than an edge case, and the bar
 * already knows the answer: up one level, to `fallback`.
 *
 * The press is taken on Android whatever the stack holds, so the two buttons can
 * never disagree — `goBack` pops when there is something to pop, which is what
 * the system would have done anyway. It is registered only while the screen is
 * focused, so the screens still mounted underneath it in the stack do not answer
 * for it, and only on Android because nothing else has this button: iOS has no
 * hardware back, and on the web the browser owns its own.
 *
 * A sheet open over the screen is not affected: a modal takes the press itself
 * and closes, which never reaches this.
 */
export function useHardwareBack(fallback: string): void {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        goBack(fallback);
        return true;
      });
      return () => subscription.remove();
    }, [fallback]),
  );
}

/** The left side of the top bar, for a screen whose parent is `fallback`. */
export function backHeader(fallback: string): () => ReactElement {
  return function BackHeader(): ReactElement {
    return <HeaderButton label="‹ Back" accessibilityLabel="Go back" onPress={() => goBack(fallback)} />;
  };
}
