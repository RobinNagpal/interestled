import type { ReactElement } from "react";
import { Button } from "../ui/button";
import { Text } from "../ui/text";

/**
 * One action in the top bar. Written here rather than left to the navigator's
 * default back arrow because a screen opened from a link has no stack to go
 * back through, and a bar whose left side is sometimes empty reads as a
 * different screen each time.
 */
export function HeaderButton({
  label,
  onPress,
  accessibilityLabel,
  tone = "normal",
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  tone?: "normal" | "danger";
}): ReactElement {
  return (
    <Button
      variant="ghost"
      size="sm"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      // 44pt of touchable height comes from the size; the padding is narrower
      // than a body button's because the bar is the one place a mis-tap costs
      // the whole screen you were on and the target still has to fit beside a
      // title.
      className="px-2"
    >
      <Text className={`text-base font-normal ${tone === "danger" ? "text-warn" : "text-accent"}`}>
        {label}
      </Text>
    </Button>
  );
}
