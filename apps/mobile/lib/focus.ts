import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { focusManager } from "@tanstack/react-query";

/**
 * Tell the query cache when the app comes to the foreground.
 *
 * On the web the cache listens to the tab's own visibility, so switching back
 * to the site refetches learner state by itself. A phone has no tab: the app
 * goes to the background and comes back through `AppState`, and unless that is
 * wired up the cache never hears about it — which is exactly the moment the map
 * is most likely to be behind, because the website was open in between.
 */
export function useAppFocus(): void {
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    const subscription = AppState.addEventListener("change", (status) => {
      focusManager.setFocused(status === "active");
    });
    return () => subscription.remove();
  }, []);
}
