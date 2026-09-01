import { READ_TIMES, Step } from "@interestled/schemas";
import type { CardDepthT } from "@interestled/schemas";

/**
 * One rung down or up the depth scale. Written here rather than as `depth - 1`
 * at the call site because the clamp is the whole of it: a control that runs off
 * the end of its own scale is one that looks broken, so the screen asks where a
 * step lands and disables the button when the answer is where it already is.
 */
export function depthAfter(current: CardDepthT, step: Step): CardDepthT {
  return clamp(step === Step.Up ? current + 1 : current - 1);
}

function clamp(value: number): CardDepthT {
  return Math.min(5, Math.max(1, value));
}

/**
 * One rung along the read-time ladder, from any number of minutes — a node's own
 * estimate need not be on the ladder, and "longer than 6" still has to mean 7.
 * `ceiling` is what a card may be written to, which is below the ladder's top.
 */
export function readTimeAfter(current: number, step: Step, ceiling: number): number {
  const rungs = READ_TIMES.filter((minutes) => minutes <= ceiling);
  const next =
    step === Step.Up
      ? rungs.find((minutes) => minutes > current)
      : [...rungs].reverse().find((minutes) => minutes < current);
  // No rung that way is the end of the scale, and the end of the scale is where
  // you already are — which is what disables the button rather than moving it.
  return next ?? current;
}

/**
 * Depth is sticky: it follows the learner rather than resetting per node, so
 * three presses of "deeper" change where subsequent cards start. Averaged
 * rather than jumped, so one curious tangent does not relevel the whole topic.
 */
export function nextDefaultDepth(current: CardDepthT, used: CardDepthT): CardDepthT {
  return clamp(Math.round((current + used) / 2));
}
