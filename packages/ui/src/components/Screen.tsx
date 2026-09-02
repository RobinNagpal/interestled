import { useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
// This is the wrapper the rule points at, so it is where the real one lives.
// eslint-disable-next-line no-restricted-imports
import { Platform, ScrollView, View } from "react-native";
import { keyboardOverlap } from "../keyboard";

/**
 * The height the keyboard is covering, live. Always 0 off the web, where the
 * platform's own inset handling does this and adding a second one would move
 * the screen twice.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    // Every browser this matters on has it; the check is for the ones that do
    // not, where there is nothing to be done and nothing should be attempted.
    const viewport = window.visualViewport;
    if (viewport === null || viewport === undefined) {
      return;
    }
    const update = (): void => {
      setInset(keyboardOverlap(window.innerHeight, viewport.height, viewport.offsetTop));
    };
    update();
    // Opening the keyboard resizes the visual viewport; scrolling the page to
    // reveal a field moves it, which changes what is covered without resizing
    // anything.
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}

/**
 * Bring whatever is focused back into view once the app has been shrunk.
 *
 * Shrinking is not enough on its own: the browser scrolls the focused field
 * into view as it opens the keyboard, against the full-height layout, and that
 * scroll position is the one that leaves the field underneath. It has no reason
 * to try again afterwards, and it does nothing at all when a second field is
 * tapped while the keyboard is already up, so both moments are asked for here.
 *
 * It reads the focused element off the document rather than being told where to
 * look, which is what lets one copy at the root serve every screen and the
 * sheets that open over them.
 */
function useRevealFocused(inset: number): void {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || inset === 0) {
      return;
    }
    const reveal = (): void => {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement) {
        focused.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    // After the shrink has been laid out, or it scrolls against the old height.
    const timer = window.setTimeout(reveal, 100);
    document.addEventListener("focusin", reveal);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", reveal);
    };
  }, [inset]);
}

/**
 * The whole app, ending where the keyboard begins.
 *
 * This wraps the navigator rather than each screen with a field on it, because
 * "which screens have a field" is a question that gets a different answer every
 * time somebody adds one — and the screen that gets missed is not discovered
 * until a learner is typing into a box they cannot see. Sitting it above every
 * screen makes it structural: there is nothing for a new screen to remember,
 * and nothing for an old one to lose when a field is added to it.
 *
 * `Sheet` carries its own copy, and is the one place that has to: a modal is
 * mounted outside this on the web, so it is not inside anything this shrinks.
 */
export function KeyboardInset({ children }: { children: ReactNode }): ReactElement {
  const inset = useKeyboardInset();
  useRevealFocused(inset);

  return (
    <View className="flex-1" style={inset === 0 ? undefined : { paddingBottom: inset }}>
      {children}
    </View>
  );
}

/**
 * A screen: everything on it scrolls, and the keyboard never eats the first tap.
 *
 * Every screen in the app is one of these rather than a bare `ScrollView`,
 * including the ones with no field on them today. A screen is one full-height
 * scrolling box, so the props that make one behave with a keyboard up have
 * exactly one right answer, and having them in one place is what stops the
 * answer being given again, differently, on the next screen.
 */
export function Screen({
  children,
  contentContainerClassName,
}: {
  children: ReactNode;
  contentContainerClassName?: string;
}): ReactElement {
  return (
    <ScrollView
      contentContainerClassName={contentContainerClassName}
      // Tapping a button while the keyboard is up presses the button, rather
      // than being spent dismissing the keyboard.
      keyboardShouldPersistTaps="handled"
      // Dragging the screen puts the keyboard away — on a phone. On the web
      // react-native-web hangs this off every scroll event rather than a drag,
      // including the one that brings the focused field back into view, so the
      // mode that reads well natively blurs the box being typed into here.
      keyboardDismissMode={Platform.OS === "web" ? "none" : "on-drag"}
      // iOS does the inset and the scroll to the field itself, natively.
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}
