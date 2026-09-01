import { CardAngle, ContentFormat, EnglishLevel, TechnicalDetail } from "@interestled/schemas";
import type { CardSettingsT } from "@interestled/schemas";

/**
 * The words for the settings, in one place because two screens now set the same
 * things: the topic's own defaults on the edit screen, and this card's
 * overrides under the card itself. A chip reading "technical_and_deep" would be
 * asking the learner to guess what it does, and two screens guessing separately
 * would end up guessing differently.
 *
 * The bodies say what each one actually changes about the writing, which is the
 * same thing the guides in the server's prompts.ts tell the model.
 */
export const ENGLISH_COPY: Record<EnglishLevel, { label: string; body: string }> = {
  [EnglishLevel.Simple]: {
    label: "Simple",
    body: "Everyday words, short sentences, nothing assumed about your vocabulary.",
  },
  [EnglishLevel.Medium]: { label: "Medium", body: "Ordinary prose — neither simplified nor dense." },
  [EnglishLevel.Advanced]: {
    label: "Advanced",
    body: "Dense and precise, with the language taken as read.",
  },
};

/** Keyed by the enum, so a level added without copy fails the build rather than the screen. */
export const ENGLISH_OPTIONS = Object.values(EnglishLevel).map((value) => ({
  value,
  label: ENGLISH_COPY[value].label,
}));

/**
 * Asked apart from the English above, because the two do not answer each other:
 * plain sentences carrying the field's real terminology is exactly what someone
 * learning a subject in a second language wants, and one chip could not say it.
 */
export const TECHNICAL_COPY: Record<TechnicalDetail, { label: string; body: string }> = {
  [TechnicalDetail.Low]: {
    label: "Light",
    body: "The idea in your terms. Field vocabulary only where nothing else will do.",
  },
  [TechnicalDetail.Medium]: {
    label: "Some",
    body: "The terms that carry weight, each explained where it first appears.",
  },
  [TechnicalDetail.High]: {
    label: "Full",
    body: "The field's own terms, notation and real values throughout.",
  },
};

export const TECHNICAL_OPTIONS = Object.values(TechnicalDetail).map((value) => ({
  value,
  label: TECHNICAL_COPY[value].label,
}));

/** Prose to read through, or entries to look up. Neither of the two axes above. */
export const FORMAT_COPY: Record<ContentFormat, { label: string; body: string }> = {
  [ContentFormat.Prose]: {
    label: "Read through",
    body: "One explanation, in order, meant to be read from the top.",
  },
  [ContentFormat.ReferenceNotes]: {
    label: "Look up",
    body: "The rule, when it holds, and the real values — each stated flat on its own.",
  },
};

export const FORMAT_OPTIONS = Object.values(ContentFormat).map((value) => ({
  value,
  label: FORMAT_COPY[value].label,
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
    `${ENGLISH_COPY[settings.englishLevel].label.toLowerCase()} English`,
    `${TECHNICAL_COPY[settings.technicalDetail].label.toLowerCase()} detail`,
  ];
  if (settings.format !== ContentFormat.Prose) {
    parts.push(FORMAT_COPY[settings.format].label.toLowerCase());
  }
  if (settings.angle !== CardAngle.Base) {
    parts.push(ANGLE_COPY[settings.angle].toLowerCase());
  }
  return parts.join(" · ");
}
