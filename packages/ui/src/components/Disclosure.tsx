import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, UIManager, View } from "react-native";
import type { ReactElement, ReactNode } from "react";
import { Text } from "../ui/text";
import { cn } from "../ui/utils";

// Android needs this switched on before LayoutAnimation does anything at all,
// and the call is a no-op everywhere else.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental !== undefined) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * One section that opens and closes.
 *
 * This is not from the react-native-reusables registry, which is where a
 * component is meant to come from. The registry's accordion is built on
 * `@rn-primitives/accordion`, a dependency this app does not have, and it
 * carries a multi-part API — Accordion, Item, Trigger, Content — for a set of
 * open sections, which is a thing nothing here needs. Replace this with the
 * vendored one the day either becomes true.
 *
 * `summary` is what the closed row says about what is inside, so the reader can
 * decide whether to open it without opening it. That is the whole reason a
 * closed row is not just a title: a control panel folded away behind the word
 * "Settings" is one the reader has to open to find out it holds nothing they
 * want.
 */
export function Disclosure({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}): ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((current) => !current);
        }}
        className="flex-row items-center gap-3 p-4"
      >
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-ink">{title}</Text>
          {summary === undefined ? null : (
            <Text variant="muted" className="text-xs">
              {summary}
            </Text>
          )}
        </View>
        {/* A triangle rather than an icon set: the app has no icon dependency,
            and one added for a single glyph is a dependency to keep in step. */}
        <Text className="text-xs text-ink-faint">{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open ? <View className="gap-4 px-4 pb-4">{children}</View> : null}
    </View>
  );
}
