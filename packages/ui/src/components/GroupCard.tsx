import { Pressable, Text, View } from "react-native";
import type { ReactElement, ReactNode } from "react";

/**
 * A group on the map, drawn as a card with its children inside it rather than as
 * a heading with an indent. Indentation alone stops reading as structure by the
 * third level and disappears entirely once a title wraps, so the containment is
 * drawn: the card holds what belongs to it, and depth is a place on the page
 * rather than a distance from the left edge.
 *
 * Each level gets its own fade, one shade apart and always with an edge. The
 * fades are close together on purpose — the ADHD guidelines treat a loud screen
 * as a cost paid on every glance (A13) — and the border is what keeps that
 * closeness legible: two backgrounds this similar cannot separate themselves.
 *
 * Nothing below the second level of grouping needs a fade of its own, because a
 * map is two or three levels and the third is leaves.
 */
function fade(depth: number): { card: string; band: string } {
  return depth <= 0
    ? { card: "border-line-strong", band: "border-line-strong bg-accent-tint" }
    : { card: "border-line", band: "border-line bg-surface-sunken" };
}

/**
 * The expand control. It is a filled accent disc when the group is closed and a
 * quiet one when it is open, so the loudest thing on the row is the offer to
 * show what is hidden — a "+" set in faint grey reads as decoration, and a
 * collapsed group nobody can see the way into is a map with a hole in it.
 */
export function ExpandToggle({ expanded }: { expanded: boolean }): ReactElement {
  return (
    <View
      className={`h-9 w-9 items-center justify-center rounded-full ${
        expanded ? "bg-accent-soft" : "bg-accent"
      }`}
    >
      <Text className={`text-xl font-bold ${expanded ? "text-accent" : "text-white"}`}>
        {expanded ? "−" : "+"}
      </Text>
    </View>
  );
}

export function GroupCard({
  depth,
  band,
  toggle,
  children,
}: {
  depth: number;
  /** The heading itself: title, claim, whatever the screen puts on the band. */
  band: ReactNode;
  /** Present when the group collapses; the whole band is then the target. */
  toggle?: { expanded: boolean; label: string; onPress: () => void };
  children?: ReactNode;
}): ReactElement {
  const look = fade(depth);
  const open = toggle === undefined || toggle.expanded;
  const bandClass = `flex-row items-center gap-3 p-3 ${look.band} ${
    open && children !== undefined ? "border-b" : ""
  }`;
  return (
    <View className={`overflow-hidden rounded-card border bg-surface-raised ${look.card}`}>
      {toggle === undefined ? (
        <View className={bandClass}>{band}</View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: toggle.expanded }}
          accessibilityLabel={`${toggle.expanded ? "Collapse" : "Expand"} ${toggle.label}`}
          onPress={toggle.onPress}
          className={bandClass}
        >
          <View className="flex-1 gap-0.5">{band}</View>
          <ExpandToggle expanded={toggle.expanded} />
        </Pressable>
      )}
      {open && children !== undefined ? <View className="gap-2 p-2">{children}</View> : null}
    </View>
  );
}

/** A leaf sitting inside a group card: plain white, so the rows are what stands out. */
export function MapRow({ tone = "plain", children }: { tone?: "plain" | "warn"; children: ReactNode }): ReactElement {
  return (
    <View
      className={`rounded-card border bg-surface ${tone === "warn" ? "border-warn/40" : "border-line"}`}
    >
      {children}
    </View>
  );
}
