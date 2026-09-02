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
    // The node's own, because the node is what carries them: a control that
    // did not reach the default would be one the plain card ignores.
    instructions: node.cardInstructions,
  };
}

/**
 * Whether two sets of card settings would produce the same card.
 *
 * The panel under a card holds what the reader has moved the chips to, and the
 * card on screen was written to something else until they press the button. The
 * difference between the two is the whole state of that panel — what the button
 * is for, whether the summary line is describing the card or a card nobody has
 * asked for yet — so it is asked once here rather than compared field by field
 * at three call sites that would each forget a different field.
 */
export function sameCardSettings(a: CardSettingsT, b: CardSettingsT): boolean {
  return (
    a.depth === b.depth &&
    a.minutes === b.minutes &&
    a.englishLevel === b.englishLevel &&
    a.technicalDetail === b.technicalDetail &&
    a.format === b.format &&
    a.paragraphLength === b.paragraphLength &&
    a.angle === b.angle &&
    a.instructions === b.instructions
  );
}
