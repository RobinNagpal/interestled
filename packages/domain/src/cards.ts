import { CARD_MINUTES_MAX, CardAngle, CardDepth } from "@interestled/schemas";
import type { CardSettingsT, LearningNodeT, TopicT } from "@interestled/schemas";

/** Never zero (a branch), never past what one card can hold. */
export function cardMinutes(minutes: number): number {
  return Math.max(1, Math.min(minutes, CARD_MINUTES_MAX));
}

/**
 * The settings a card is written to when the learner has not overridden any of
 * them: the topic's own register and read time, and the node's own estimate
 * where that is shorter — a longer card than the map admits to is the map lying
 * about time, which is the one thing it is not allowed to do.
 *
 * Shared rather than server-side because the app names what a card is being
 * written to while it is being written. Two copies of this rule would disagree
 * the first time either changed, and the wait would then describe a card that
 * never came.
 */
export function defaultCardSettings(
  topic: TopicT,
  node: LearningNodeT,
  depth: number,
): CardSettingsT {
  return {
    depth: CardDepth.parse(depth),
    minutes: cardMinutes(Math.min(node.minutes || topic.averageReadTime, topic.averageReadTime)),
    englishLevel: topic.englishLevel,
    technicalDetail: topic.technicalDetail,
    format: topic.format,
    paragraphLength: topic.paragraphLength,
    angle: CardAngle.Base,
  };
}
