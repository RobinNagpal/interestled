// A sheet is not a screen: it scrolls inside its own card, and it is mounted
// outside the root view, so it carries the keyboard inset itself below.
// eslint-disable-next-line no-restricted-imports
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { ReactElement, ReactNode } from "react";
import { Text } from "../ui/text";
import { useKeyboardInset } from "./Screen";

/**
 * A question asked in front of the screen it belongs to, rather than on a screen
 * of its own. The map choice and the rebuild instructions both work this way: the
 * learner keeps sight of what they were doing, and dismissing costs one tap on
 * the backdrop, so opening it is never a commitment.
 */
export function Sheet({
  visible,
  title,
  body,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  body?: string;
  onClose: () => void;
  children: ReactNode;
}): ReactElement {
  // A sheet sits against the bottom of the screen, which is exactly where the
  // keyboard opens, so a sheet with a box in it is the case that hides most.
  const inset = useKeyboardInset();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={inset === 0 ? undefined : { paddingBottom: inset }}>
        {/*
         * The backdrop is a SIBLING of the card, never its ancestor. A Pressable
         * wrapping the card reads on the web as a role="button" ancestor of
         * everything inside it, and react-native-web treats a space key pressed
         * anywhere beneath it as a press of the button — so typing the first
         * space into the box below dismissed the sheet mid-sentence. Sitting it
         * behind the card instead means no key press inside the card ever
         * reaches it, and a tap on the dimmed area still lands on it.
         */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          // Geometry through the style prop rather than a class: "fill the
          // parent" is the one thing here that must hold on every target, and
          // absoluteFill is the platform's own answer to it.
          style={StyleSheet.absoluteFill}
          className="bg-ink/40"
        />
        <View className="max-h-[85%] rounded-t-card bg-surface">
          <ScrollView contentContainerClassName="gap-4 p-5" keyboardShouldPersistTaps="handled">
            <View className="gap-1">
              <Text variant="h3">{title}</Text>
              {body === undefined ? null : <Text variant="muted">{body}</Text>}
            </View>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
