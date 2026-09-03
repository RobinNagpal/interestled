import {
  CARD_DEPTHS,
  CARD_MINUTES_MAX,
  CardAngle,
  ContentFormat,
  EnglishLevel,
  MAP_DEPTHS,
  MAP_LEVELS,
  MINUTES_PER_DAY,
  MapDepth,
  MapLevels,
  NarrationVoice,
  PARAGRAPH_SENTENCES,
  ParagraphLength,
  READ_TIMES,
  STUDY_DAYS,
  StudyDays,
  TechnicalDetail,
} from "@interestled/schemas";
import type { CardSettingsT, MapShapeT } from "@interestled/schemas";

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

/** Asked apart from the English above, because the two do not answer each other. */
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

/**
 * What each map depth means, and what each rung of the day ladder is called.
 *
 * MAP_DEPTH_COPY is not DEPTH_COPY further down: that one is the card's depth,
 * which decides how far a single explanation digs and follows the learner across
 * every topic. This decides where the whole map stops. Both run 1-5, which is
 * exactly why they need different names.
 * Here with the rest of the settings copy: the create screen and the rebuild
 * sheet both offer them, and two screens naming the same chip differently is the
 * thing this file exists to stop.
 *
 * The bodies say what the depth actually changes about the map, which is the
 * same thing MAP_DEPTH_GUIDE in the server's prompts.ts tells the model.
 */
export const MAP_DEPTH_COPY: Record<MapDepth, { label: string; body: string }> = {
  [MapDepth.Orientation]: {
    label: "Orientation",
    body: "What it is, and when you would reach for it.",
  },
  [MapDepth.Working]: { label: "Working", body: "Enough to use it for the everyday cases." },
  [MapDepth.Mechanism]: {
    label: "Mechanism",
    body: "The mechanism underneath, in the field's own terms.",
  },
  [MapDepth.Internals]: {
    label: "Internals",
    body: "The layer below that — internals, protocols, the maths.",
  },
  [MapDepth.Expert]: {
    label: "Expert",
    body: "Edge cases, failure modes, and where the standard account is wrong.",
  },
};

export const MAP_DEPTH_OPTIONS = MAP_DEPTHS.map((value) => ({
  value: String(value),
  label: MAP_DEPTH_COPY[value].label,
}));

/**
 * How many rows of headings sit above the nodes, said as what the learner will
 * see rather than as a number of levels — "two" means nothing until it is
 * "headings, and the nodes under them".
 *
 * It is the setting the two counts are read against, so it is offered before
 * them: at two levels the second count is the nodes under a heading, and at
 * three it is the headings under a heading.
 */
export const MAP_LEVELS_COPY: Record<MapLevels, { label: string; body: string }> = {
  [MapLevels.Two]: {
    label: "Two",
    body: "Headings, and the nodes under them. Right for most subjects.",
  },
  [MapLevels.Three]: {
    label: "Three",
    body: "Areas, headings under those, and the nodes under those. For a subject wide enough that its main headings would each be a topic.",
  },
};

export const MAP_LEVELS_OPTIONS = MAP_LEVELS.map((value) => ({
  value: String(value),
  label: MAP_LEVELS_COPY[value].label,
}));

/** "14 days" is a number; "2 weeks" is the thing somebody is agreeing to. */
export const DAY_COPY: Record<StudyDays, string> = {
  [StudyDays.One]: "1 day",
  [StudyDays.Three]: "3 days",
  [StudyDays.Week]: "A week",
  [StudyDays.Fortnight]: "2 weeks",
  [StudyDays.Month]: "A month",
  [StudyDays.Quarter]: "3 months",
};

export const DAY_OPTIONS = STUDY_DAYS.map((value) => ({
  value: String(value),
  label: DAY_COPY[value],
}));

export const MINUTES_OPTIONS = MINUTES_PER_DAY.map((value) => ({
  value: String(value),
  label: `${value} min`,
}));

/**
 * What a map was built to, as rows: the counts, the sitting, and how far into
 * the subject it goes.
 *
 * The same words as the chips that set them, out of the same copy above — the
 * edit screen states what the map was built to, and a reader who is told
 * "Working" there and offered "Working" in the rebuild sheet is being told
 * about one setting rather than two.
 */
export interface MapShapeRow {
  label: string;
  value: string;
  /** What the value means, where the label and the value do not say it. */
  body?: string;
}

export function mapShapeRows(shape: MapShapeT): MapShapeRow[] {
  return [
    {
      label: "Levels",
      value: MAP_LEVELS_COPY[shape.levels].label,
      body: MAP_LEVELS_COPY[shape.levels].body,
    },
    { label: "Main headings", value: String(shape.mainHeadings) },
    // Named for what it counts at this level count, in the same words the chip
    // that sets it uses: a panel saying "sub-headings" about a map whose second
    // level is its nodes is the panel describing a different map.
    {
      label: shape.levels === MapLevels.Three ? "Sub-headings under each" : "Nodes under each",
      value: String(shape.subHeadings),
    },
    { label: "A sitting", value: `${shape.minutesPerDay} min` },
    { label: "Over", value: DAY_COPY[shape.days] },
    {
      label: "How far in",
      value: MAP_DEPTH_COPY[shape.depth].label,
      body: MAP_DEPTH_COPY[shape.depth].body,
    },
  ];
}

/**
 * The same shape in one line, for a closed row that has to say what is inside
 * it. Lower-cased against the labels above, because this is read as a sentence
 * fragment rather than as a set of fields.
 *
 * One day is one sitting, and it is said that way here for the same reason the
 * seeded instruction line says it that way: "20 min a day for 1 day" is two ways
 * of saying the same number with a grammatical error between them.
 */
export function mapShapeSummary(shape: MapShapeT): string {
  const time =
    shape.days === StudyDays.One
      ? `${shape.minutesPerDay} min in one sitting`
      : `${shape.minutesPerDay} min a day for ${DAY_COPY[shape.days].toLowerCase()}`;
  return [
    `${shape.levels} levels`,
    `${shape.mainHeadings} headings, ${shape.subHeadings} under each`,
    time,
    MAP_DEPTH_COPY[shape.depth].label.toLowerCase(),
  ].join(" · ");
}

/**
 * How long a paragraph runs, labelled by the sentence count — the thing actually
 * being chosen, rather than a word for it.
 *
 * Here rather than on a screen because both places that offer it must offer the
 * same three: the topic's settings screen, and the panel under a card where the
 * learner overrides them for that card alone.
 */
export const PARAGRAPH_OPTIONS = Object.values(ParagraphLength).map((value) => ({
  value,
  label: PARAGRAPH_SENTENCES[value],
}));

/**
 * The voices a topic can be read in.
 *
 * Named by the voice rather than by a role ("the calm one", "the teacher"),
 * because the name is what Google calls it and inventing a second name for the
 * same thing is how the two drift apart. The body is what it sounds like, which
 * is the part worth reading before pressing anything.
 *
 * Keyed by the enum, so a voice added without copy fails the build rather than
 * the screen — the same rule the settings above follow.
 */
export const VOICE_COPY: Record<NarrationVoice, { label: string; body: string }> = {
  [NarrationVoice.Erinome]: {
    label: "Erinome",
    body: "Clear and unhurried, with nothing in the way of the words. The default.",
  },
  [NarrationVoice.Schedar]: { label: "Schedar", body: "Even and level, start to finish." },
  [NarrationVoice.Charon]: { label: "Charon", body: "Informative — the register of a briefing." },
  [NarrationVoice.Kore]: { label: "Kore", body: "Firm and definite, a little more weight on it." },
  [NarrationVoice.Sulafat]: { label: "Sulafat", body: "Warm, and the easiest to sit with for long." },
  [NarrationVoice.Achird]: { label: "Achird", body: "Friendly, as if talking rather than reading." },
  [NarrationVoice.Sadaltager]: {
    label: "Sadaltager",
    body: "Knowledgeable — somebody who has explained this before.",
  },
  [NarrationVoice.Vindemiatrix]: { label: "Vindemiatrix", body: "Gentle and quiet-spoken." },
};

export const VOICE_OPTIONS = Object.values(NarrationVoice).map((value) => ({
  value,
  label: VOICE_COPY[value].label,
}));

/**
 * What moving that chip costs, which is the one thing about it worth warning
 * about: the voice is part of where a recording lives, so a topic put into
 * another voice stops matching everything it has already recorded.
 */
export const VOICE_NOTE =
  "Cards are read in this voice. Anything already recorded was read in the old one and is recorded again, in the new voice, the next time you press play.";

/** What that chip changes, said once for both of the screens that offer it. */
export const PARAGRAPH_NOTE =
  "Each section is written in paragraphs this long, with a heading over each. It is the one thing about the shape of a card you feel immediately.";

/**
 * The read-time ladder as chips, for the topic's own setting.
 *
 * The ladder itself, so the chips and what a node may claim cannot drift apart.
 */
export const READ_TIME_OPTIONS = READ_TIMES.map((minutes) => ({
  value: String(minutes),
  label: `${minutes} min`,
}));

/**
 * The same ladder cut to what one card may be written to, with `current` added
 * when it is not a rung.
 *
 * A node's own estimate is any whole number of minutes, so the card in front of
 * the reader can stand at 6 while the ladder goes 5, 7 — and a row of chips with
 * none of them on is a row that cannot say what it is describing.
 */
export function cardMinuteOptions(current: number): { value: string; label: string }[] {
  const rungs: number[] = READ_TIMES.filter((minutes) => minutes <= CARD_MINUTES_MAX);
  const ladder = rungs.some((minutes) => minutes === current)
    ? rungs
    : [...rungs, current].sort((a, b) => a - b);
  return ladder.map((minutes) => ({ value: String(minutes), label: `${minutes} min` }));
}

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
 * The depth scale as chips. The number stays on the label because depth is a
 * scale before it is five names: "4 - the layer under it" says which way is
 * deeper, and "the layer under it" on its own does not.
 */
export const DEPTH_OPTIONS = CARD_DEPTHS.map((value) => ({
  value: String(value),
  label: `${value} · ${DEPTH_COPY[value] ?? ""}`,
}));

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
  // Not the text itself — it can be a paragraph — but that it was there, since
  // a card written with instructions and one without are different cards.
  if (settings.instructions !== "") {
    parts.push("your instructions");
  }
  return parts.join(" · ");
}
