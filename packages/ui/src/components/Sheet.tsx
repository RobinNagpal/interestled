import { Modal, Pressable, ScrollView, Text, View } from "react-native";
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        className="flex-1 justify-end bg-ink/40"
      >
        {/* Swallows the press so a tap inside the card does not dismiss it. */}
        <Pressable onPress={() => undefined} className="max-h-[85%] rounded-t-card bg-surface">
          <ScrollView contentContainerClassName="gap-4 p-5">
            <View className="gap-1">
              <Text className="text-xl font-semibold text-ink">{title}</Text>
              {body === undefined ? null : <Text className="text-sm text-ink-soft">{body}</Text>}
            </View>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
