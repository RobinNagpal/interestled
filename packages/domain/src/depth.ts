import { MAX_CARD_DEPTH, MIN_CARD_DEPTH } from "@interestled/schemas";
import type { CardDepthT } from "@interestled/schemas";

/**
 * Depth is sticky: it follows the learner rather than resetting per node, so
 * three cards asked for deeper change where subsequent cards start. Averaged
 * rather than jumped, so one curious tangent does not relevel the whole topic.
 */
export function nextDefaultDepth(current: CardDepthT, used: CardDepthT): CardDepthT {
  return Math.min(MAX_CARD_DEPTH, Math.max(MIN_CARD_DEPTH, Math.round((current + used) / 2)));
}
