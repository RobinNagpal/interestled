import { CardAngle, ContentStyle } from "@interestled/schemas";
import type { CardSettingsT } from "@interestled/schemas";

/**
 * The words for the settings, in one place because two screens now set the same
 * things: the topic's own defaults on the edit screen, and this card's
 * overrides under the card itself. A chip reading "technical_and_deep" would be
 * asking the learner to guess what it does, and two screens guessing separately
 * would end up guessing differently.
 *
 * The bodies say what each one actually changes about the writing, which is the
 * same thing CONTENT_STYLE_GUIDE tells the model server-side.
 */
export const STYLE_COPY: Record<ContentStyle, { label: string; body: string }> = {
  [ContentStyle.ShortAndCrisp]: {
    label: "Short and crisp",
    body: "The shortest thing that answers it. One example, nothing said twice.",
  },
  [ContentStyle.ShortAndTechnical]: {
    label: "Short, technical",
    body: "As short, but assuming you know the words. The answer without the introduction.",
  },
  [ContentStyle.PlainAndDeep]: {
    label: "Plain, in depth",
    body: "All the way down to how it works, in everyday words. Jargon replaced or explained where it first appears.",
  },
  [ContentStyle.TechnicalAndDeep]: {
    label: "Technical, in depth",
    body: "All the way down, in the field's own terms, used precisely.",
  },
  [ContentStyle.ReferenceNotes]: {
    label: "Reference notes",
    body: "Written to be looked up rather than read through: the rule, when it holds, and the real values, each on its own.",
  },
};

/** Keyed by the enum, so a style added without copy fails the build rather than the screen. */
export const STYLE_OPTIONS = Object.values(ContentStyle).map((value) => ({
  value,
  label: STYLE_COPY[value].label,
}));

/** The same depth, asked a different way. "Plain" is the way back to the card as written. */
export const ANGLE_COPY: Record<CardAngle, string> = {
  [CardAngle.Base]: "Plain",
  [CardAngle.MoreConcrete]: "More concrete",
  [CardAngle.WhyItMatters]: "Why it matters",
  [CardAngle.WhereThisBreaks]: "Where this breaks",
};

export const ANGLE_OPTIONS = Object.values(CardAngle).map((value) => ({
  value,
  label: ANGLE_COPY[value],
}));

/** What each depth is, in the learner's terms rather than as a number alone. */
export const DEPTH_COPY: Record<number, string> = {
  1: "the gist",
  2: "the working idea",
  3: "the mechanism",
  4: "the layer under it",
  5: "expert",
};

/**
 * The settings a card is being, or has been, written to — as one line.
 *
 * Writing a card takes ten to thirty seconds, and a wait that says only that
 * something is happening is one nobody can tell from a hang. Naming what is
 * being written also makes the wait worth having: the reader can see that the
 * length and the register they chose are the ones being used, which is the only
 * moment the settings screen's answers are ever visible in the product.
 *
 * The angle is left out when it is Base, because "Plain" is the absence of an
 * angle rather than one more thing chosen.
 */
export function settingsSummary(settings: CardSettingsT): string {
  const parts = [
    `depth ${settings.depth} of 5 — ${DEPTH_COPY[settings.depth] ?? ""}`,
    `about ${settings.minutes} min`,
    STYLE_COPY[settings.style].label.toLowerCase(),
  ];
  if (settings.angle !== CardAngle.Base) {
    parts.push(ANGLE_COPY[settings.angle].toLowerCase());
  }
  return parts.join(" · ");
}
