import { useEffect } from "react";
import { AppState } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

/**
 * The one thing holding the screen on, named so the two calls pair up. A tag is
 * a lock somebody has to release by name, so there is exactly one here.
 */
const TAG = "interestled-playing";

/**
 * Keep the screen on while `active`.
 *
 * A card read out loud runs for minutes with nobody touching the phone, so the
 * display goes out and then the phone locks — in the middle of the one feature
 * whose whole point is that you are not looking at it. Listening is still using
 * the app, and the screen still carries the controls: the position, the pause
 * button, and the card the voice is talking about.
 *
 * Held only while something is actually playing. A lock taken for as long as a
 * card is open would sit on somebody's battery for the twenty minutes they left
 * it on the table.
 *
 * Both calls can reject and neither failure is worth a screen: the browser may
 * not have the Wake Lock API at all, refuse it in the background, or have
 * dropped the lock already, and the answer to every one of those is the ordinary
 * behaviour of the screen going off. Native has none of these — it is a flag on
 * the window.
 *
 * The re-acquire on foreground is for the web, where the browser releases the
 * lock the moment the tab is hidden and never gives it back on its own. On the
 * phone the flag survives, and asking again for a tag that is already held costs
 * nothing.
 */
export function useScreenAwake(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    const hold = (): void => {
      void activateKeepAwakeAsync(TAG).catch(() => undefined);
    };
    hold();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        hold();
      }
    });
    return () => {
      subscription.remove();
      void deactivateKeepAwake(TAG).catch(() => undefined);
    };
  }, [active]);
}
