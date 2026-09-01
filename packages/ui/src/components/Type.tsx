import type { ReactElement } from "react";
import { Text } from "../ui/text";

/** A stated seam between ideas, so the first can be banked before the next loads. */
export function SectionTitle({ children }: { children: string }): ReactElement {
  return (
    <Text variant="small" className="text-xs uppercase tracking-wide text-ink-faint">
      {children}
    </Text>
  );
}

/** Honest minute estimate. People start things they can finish. */
export function Minutes({ value }: { value: number }): ReactElement {
  return (
    <Text variant="muted" className="text-xs text-ink-faint">
      {value} min
    </Text>
  );
}
