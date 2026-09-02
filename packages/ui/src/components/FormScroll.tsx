import { useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Platform, ScrollView, View } from "react-native";
import { keyboardOverlap } from "../keyboard";

/**
 * The height the keyboard is covering, live. Always 0 off the web, where the
 * platform's own inset handling does this and adding a second one would move
 * the form twice.
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
 * Bring whatever is focused into view once the box has been shrunk.
 *
 * Shrinking the box is not enough on its own: the browser scrolls a focused
 * field into view as it opens the keyboard, against the full-height box, and
 * that scroll position is the one that leaves the field underneath. It has no
 * reason to try again afterwards, and it does nothing at all when a second
 * field is tapped while the keyboard is already up, so both moments are asked
 * for here.
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
 * A screen with fields on it: the same `ScrollView` every other screen is, with
 * the keyboard kept off the field being typed into.
 *
 * This is the wrapper rather than screens passing the props themselves because
 * "the box you are typing in stays visible" is a rule about the product, not a
 * preference per screen — a form that breaks it loses whatever was being typed
 * the moment the learner scrolls to find it.
 */
export function FormScroll({
  children,
  contentContainerClassName,
}: {
  children: ReactNode;
  contentContainerClassName?: string;
}): ReactElement {
  const inset = useKeyboardInset();
  useRevealFocused(inset);

  return (
    <View className="flex-1" style={inset === 0 ? undefined : { paddingBottom: inset }}>
      <ScrollView
        contentContainerClassName={contentContainerClassName}
        // Tapping a button while the keyboard is up presses the button, rather
        // than being spent dismissing the keyboard.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // iOS does the whole of this itself, including the scroll to the field.
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    </View>
  );
}
