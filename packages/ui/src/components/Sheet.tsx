import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactElement, ReactNode } from "react";

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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
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
          <ScrollView contentContainerClassName="gap-4 p-5">
            <View className="gap-1">
              <Text className="text-xl font-semibold text-ink">{title}</Text>
              {body === undefined ? null : <Text className="text-sm text-ink-soft">{body}</Text>}
            </View>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
