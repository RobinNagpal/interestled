import { DepthAction } from "@interestled/schemas";
import type { CardDepthT } from "@interestled/schemas";

/**
 * Where a depth button lands. Only two of the five actually move the depth
 * number — the other three are the same level asked a different way, which is
 * why they can be cached separately without disturbing the learner's default.
 */
export function depthAfter(current: CardDepthT, action: DepthAction): CardDepthT {
  switch (action) {
    case DepthAction.Simpler:
      return clamp(current - 1);
    case DepthAction.Deeper:
      return clamp(current + 1);
    case DepthAction.MoreConcrete:
    case DepthAction.WhyItMatters:
    case DepthAction.WhereThisBreaks:
      return current;
  }
}

function clamp(value: number): CardDepthT {
  return Math.min(5, Math.max(1, value));
}

/**
 * Depth is sticky: it follows the learner rather than resetting per node, so
 * three presses of "deeper" change where subsequent cards start. Averaged
 * rather than jumped, so one curious tangent does not relevel the whole topic.
 */
export function nextDefaultDepth(current: CardDepthT, used: CardDepthT): CardDepthT {
  return clamp(Math.round((current + used) / 2));
}
