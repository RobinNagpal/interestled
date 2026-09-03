import { z } from "zod";
import { Id } from "./ids";
import { MapAnswers } from "./mapQuestions";
import { Slug } from "./slugs";

/**
 * The kind of subject decides which drills are used and what "known" means.
 * See docs/ux/README.md, "Five kinds of topic".
 */
export enum TopicArchetype {
  System = "system",
  Story = "story",
  Tool = "tool",
  Skill = "skill",
  SelfHelp = "self_help",
}

export const TopicArchetypeSchema = z.nativeEnum(TopicArchetype);

/**
 * Minutes in one sitting, and how many days of them. The two together are what
 * the map is sized to.
 *
 * Two numbers rather than one total because "600 minutes" says nothing about
 * whether that is a week or a quarter, and the map is a different shape either
 * way. It also reads as a plan somebody can keep — "20 minutes a day for a
 * fortnight" is a decision, where "five hours" is a wish.
 */
export enum MinutesPerDay {
  Ten = 10,
  Fifteen = 15,
  Twenty = 20,
  Thirty = 30,
  Forty5 = 45,
  Sixty = 60,
}

export const MinutesPerDaySchema = z.nativeEnum(MinutesPerDay);

/**
 * The rungs in order, for the screen that offers them. A numeric enum carries a
 * reverse mapping, so Object.values gives the names back as well as the numbers.
 * Same shape as READ_TIMES below, for the same reason.
 */
export const MINUTES_PER_DAY: readonly MinutesPerDay[] = Object.values(MinutesPerDay)
  .filter((value): value is MinutesPerDay => typeof value === "number")
  .sort((a, b) => a - b);

export enum StudyDays {
  One = 1,
  Three = 3,
  Week = 7,
  Fortnight = 14,
  Month = 30,
  Quarter = 90,
}

export const StudyDaysSchema = z.nativeEnum(StudyDays);

export const STUDY_DAYS: readonly StudyDays[] = Object.values(StudyDays)
  .filter((value): value is StudyDays => typeof value === "number")
  .sort((a, b) => a - b);

/**
 * How far into the subject the whole map goes. Not how it is written and not
 * how many headings it has — how much of the thing is covered at all.
 *
 * Distinct from the card's own depth control, which decides how far one
 * explanation digs and follows the learner across every topic. This decides
 * where the map stops, which is a property of the map.
 */
export enum MapDepth {
  /** What it is and when you would reach for it. */
  Orientation = 1,
  /** Enough to use it for the everyday cases. */
  Working = 2,
  /** The mechanism underneath, in the field's own terms. */
  Mechanism = 3,
  /** The layer below that: internals, protocols, the maths. */
  Internals = 4,
  /** Edge cases, failure modes, and where the standard account is wrong. */
  Expert = 5,
}

export const MapDepthSchema = z.nativeEnum(MapDepth);

export const MAP_DEPTHS: readonly MapDepth[] = Object.values(MapDepth)
  .filter((value): value is MapDepth => typeof value === "number")
  .sort((a, b) => a - b);

/**
 * How many headings, and how many under each. The second count is the nodes
 * under a heading on a two-level map, and the sub-headings on a three-level one
 * — the nodes hang under those.
 *
 * The bounds are the generated-map schema's bounds, not a separate opinion: ask
 * for ten main headings and the parse refuses the reply, which reaches the
 * learner as a failed generation rather than as the setting it was. Both level
 * counts are held to the same two pairs, so changing the number of levels can
 * never turn a setting somebody already chose into a refused reply.
 */
export const MAIN_HEADINGS_MIN = 3;
export const MAIN_HEADINGS_MAX = 8;
export const SUB_HEADINGS_MIN = 2;
export const SUB_HEADINGS_MAX = 8;

/**
 * How many rows of headings sit above the nodes.
 *
 * Two is headings and the nodes under them, which is the right shape for most
 * subjects. Three puts a level in between, for a subject wide enough that its
 * top-level headings are areas rather than groups: the map screen collapses a
 * group, so the extra level is what keeps a wide map a thing you can see the
 * whole of rather than forty rows.
 *
 * Not the same question as MapDepth below. Depth says how far into the subject
 * the map goes; this says how the ground it does cover is grouped.
 */
export enum MapLevels {
  Two = 2,
  Three = 3,
}

export const MapLevelsSchema = z.nativeEnum(MapLevels);

/** The two, in order, for the screen that offers them. */
export const MAP_LEVELS: readonly MapLevels[] = Object.values(MapLevels)
  .filter((value): value is MapLevels => typeof value === "number")
  .sort((a, b) => a - b);

/**
 * Everything that decides the shape and size of the map, as one object.
 *
 * This replaced TimeBudget ("20 minutes / a week / ongoing"), which was
 * answering the size question more vaguely and in a second place: the heading
 * counts say the shape, and minutes a day times days says the size. Two columns
 * saying the same thing is two chances for an edit to leave them disagreeing.
 *
 * `levels` is the one setting the others are read against: the same pair of
 * counts means headings and nodes at two levels, and areas and headings at
 * three. It is here rather than in a second place for exactly that reason —
 * everything that decides what the model is asked for is one object, and
 * `mapShapeOf` carries all of it or none of it.
 */
export const MapShape = z.object({
  levels: MapLevelsSchema,
  mainHeadings: z.number().int().min(MAIN_HEADINGS_MIN).max(MAIN_HEADINGS_MAX),
  subHeadings: z.number().int().min(SUB_HEADINGS_MIN).max(SUB_HEADINGS_MAX),
  minutesPerDay: MinutesPerDaySchema,
  days: StudyDaysSchema,
  depth: MapDepthSchema,
});

export const MapShapeInput = z.object({
  levels: MapLevelsSchema.default(MapLevels.Two),
  mainHeadings: MapShape.shape.mainHeadings.default(5),
  subHeadings: MapShape.shape.subHeadings.default(4),
  minutesPerDay: MinutesPerDaySchema.default(MinutesPerDay.Twenty),
  days: StudyDaysSchema.default(StudyDays.Fortnight),
  depth: MapDepthSchema.default(MapDepth.Working),
});

export type MapShapeT = z.infer<typeof MapShape>;

/** The whole sitting count, which is what the instruction line states. */
export function totalMinutes(shape: MapShapeT): number {
  return shape.minutesPerDay * shape.days;
}

/** The shape settings alone, out of the topic every map call carries. */
export function mapShapeOf(topic: MapShapeT): MapShapeT {
  return {
    levels: topic.levels,
    mainHeadings: topic.mainHeadings,
    subHeadings: topic.subHeadings,
    minutesPerDay: topic.minutesPerDay,
    days: topic.days,
    depth: topic.depth,
  };
}

/** Map generation is one LLM call, so a topic is briefly incomplete. */
export enum TopicStatus {
  Generating = "generating",
  Ready = "ready",
  Failed = "failed",
}

export const TopicStatusSchema = z.nativeEnum(TopicStatus);

/** Shared with the server, which cuts a derived summary to fit rather than refusing it. */
export const SUMMARY_MAX = 160;

/**
 * One line under the title on the topics list, in the learner's own words. It is
 * the only thing the list can say about a topic without opening it, so it is a
 * length the eye takes in whole rather than a second paragraph of goal.
 */
export const TopicSummary = z.string().trim().max(SUMMARY_MAX);

/**
 * How long one node should take, in minutes. It is the length the map is built
 * to and the length a card is written to, so it is the one number deciding
 * whether a topic is made of one-minute sittings or quarter-hour ones.
 *
 * A ladder rather than any number: the useful answers are coarse, and eight
 * chips a learner picks from beat a number box that can say 13. It is also the
 * cap on LearningNode.minutes — the largest sitting anyone chose here is the
 * largest a node may claim.
 */
export enum ReadTime {
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Seven = 7,
  Ten = 10,
  Fifteen = 15,
}

export const ReadTimeSchema = z.nativeEnum(ReadTime);

/**
 * The ladder in order, for the screen that offers it. A numeric enum carries a
 * reverse mapping, so Object.values gives the names back as well as the numbers.
 */
export const READ_TIMES: readonly ReadTime[] = Object.values(ReadTime)
  .filter((value): value is ReadTime => typeof value === "number")
  .sort((a, b) => a - b);

/** Nothing on the map may claim more than the longest sitting on the ladder. */
export const MAX_NODE_MINUTES = ReadTime.Fifteen;

/** Long enough to say something, short enough to finish standing up. */
export const DEFAULT_AVERAGE_READ_TIME = ReadTime.Three;

/**
 * How hard the English is: the words and the sentences, not the ideas in them.
 *
 * This and TechnicalDetail below replaced a single five-value style, which had
 * been quietly answering three questions at once — how hard the words are, how
 * much of the field's own machinery appears, and how long the writing runs. The
 * third already had its own control (averageReadTime), so "short and crisp" and
 * "plain and deep" differed on an axis the settings screen was asking about
 * twice, and neither of them could say "everyday words, all the terminology" —
 * which is what someone learning a subject in a second language actually wants.
 *
 * Neither is the depth control. Depth (1-5, on the card itself) decides how far
 * down the mechanism the explanation goes and follows the learner across every
 * topic; these decide how it is written and stay with the topic.
 *
 * Nor are they the profile's learning styles, which shape what the explanation
 * is built out of — examples, analogies, a story. Those stay account-wide,
 * because they are true of the learner rather than of the subject.
 *
 * The order here is the order of the chips.
 */
export enum EnglishLevel {
  /** Everyday words, short sentences, nothing assumed about vocabulary. */
  Simple = "simple",
  /** Ordinary adult prose. */
  Medium = "medium",
  /** Dense and precise, with the vocabulary taken as read. */
  Advanced = "advanced",
}

export const EnglishLevelSchema = z.nativeEnum(EnglishLevel);

/**
 * How much of the field's own machinery appears: its terms, its notation, its
 * real values. Independent of the English, which is the whole point of asking
 * separately — the terminology can be the thing they came for while the prose
 * around it stays plain.
 */
export enum TechnicalDetail {
  /** The idea, in the learner's own terms. Field vocabulary only where nothing else will do. */
  Low = "low",
  /** The terms that carry weight, glossed where they first appear. */
  Medium = "medium",
  /** The field's own terms and values throughout, used precisely. */
  High = "high",
}

export const TechnicalDetailSchema = z.nativeEnum(TechnicalDetail);

/**
 * Prose to read through, or entries to look up. It survived the split because
 * it is neither of the two axes above: reference notes at any English level and
 * any amount of terminology are still a different shape of writing, and the
 * card prompt has a carve-out for them.
 */
export enum ContentFormat {
  Prose = "prose",
  ReferenceNotes = "reference_notes",
}

export const ContentFormatSchema = z.nativeEnum(ContentFormat);

/**
 * How long one paragraph runs. It is the one thing about the shape of a card
 * that a learner can feel immediately and could not otherwise say: "four or five
 * sentences under a heading" is a different reading experience from a wall, and
 * neither the English level nor the read time decides it.
 *
 * Stated as a range rather than a number, because the instruction is written for
 * a model and "exactly 4 sentences" is a rule it will keep by padding.
 */
export enum ParagraphLength {
  Short = "short",
  Medium = "medium",
  Long = "long",
}

export const ParagraphLengthSchema = z.nativeEnum(ParagraphLength);

/** The sentence range each length means, and what the seeded instruction says. */
export const PARAGRAPH_SENTENCES: Record<ParagraphLength, string> = {
  [ParagraphLength.Short]: "2-3 sentences",
  [ParagraphLength.Medium]: "4-5 sentences",
  [ParagraphLength.Long]: "6-8 sentences",
};

/**
 * Everything that decides how this topic is written, as one object, because
 * every generation call needs all of it and a call that quietly got half would
 * produce content the settings screen says it did not ask for.
 */
export const TopicContentSettings = z.object({
  englishLevel: EnglishLevelSchema,
  technicalDetail: TechnicalDetailSchema,
  format: ContentFormatSchema,
  paragraphLength: ParagraphLengthSchema,
  /** "" means the default applies; see TopicContentSettingsInput. */
  contentInstructions: z.string(),
  averageReadTime: ReadTimeSchema,
});

/**
 * The answers to the seven questions, and the row they were asked from. Both are
 * carried by every call that builds a map — creating a topic and rebuilding one
 * — because the questions are generated per build and a rebuild asks them again.
 *
 * Optional and empty-by-default rather than required: the plan is one extra
 * model call in front of the map, so a build with no plan behind it must still
 * produce a map. It is also what keeps a web client cached from before this
 * shipped working — it posts no planId, and gets a map built the way it always
 * was rather than a 400.
 */
export const MapChoicesInput = z.object({
  planId: Id.optional(),
  answers: MapAnswers.default([]),
});

/**
 * The instruction lines the map is built from, in the learner's own hands.
 *
 * Seeded from the shape settings — "Use 5 main headings, and 4 sub-headings
 * under each", "the whole map should take about 280 minutes" — and then editable,
 * because the settings can only say the things somebody thought to make a
 * setting for. Once edited, the saved text is what reaches the model and what a
 * rebuild shows: moving a chip afterwards does not silently rewrite a sentence
 * the learner wrote.
 *
 * "" means nothing has been written yet, so the seeded text applies. Storing a
 * copy of the seed instead would freeze it at the wording it had that day.
 */
export const MAP_INSTRUCTIONS_MAX = 2000;

/**
 * What the questions for an existing topic are generated from: the shape being
 * asked for and the instructions in front of it. The old map is deliberately not
 * sent — the learner is describing the map they want, not editing the one they
 * have.
 */
export const TopicQuestionsInput = z.object({
  ...MapShapeInput.shape,
  mapInstructions: z.string().trim().max(MAP_INSTRUCTIONS_MAX).default(""),
});

/**
 * Three questions and nothing else: what to learn, what for, and what they
 * already know.
 *
 * `goal` and `level` keep their column names and narrow their meaning. `goal`
 * asks how they plan to use the knowledge, which is what it was already mostly
 * being answered with. `level` asks only what they currently know — the "where
 * do you want to get to" half moved out to the depth setting, where it is a
 * number the map can actually be built to rather than a sentence somebody has to
 * interpret.
 */
export const TopicCreateInput = z.object({
  title: z.string().trim().min(2, "Name the topic").max(120),
  /**
   * How they plan to use this. Free text rather than a list of strings: people
   * write "debug it when it breaks" in one line and three separate boxes would
   * only make that harder to say.
   */
  goal: z.string().trim().max(600).default(""),
  /**
   * What they already know about it. It is the highest-value answer on the
   * form — it decides which whole branches are dropped before the learner ever
   * sees them, and two of the generated questions ask about it directly.
   */
  level: z.string().trim().max(600).default(""),
  ...MapShapeInput.shape,
  mapInstructions: z.string().trim().max(MAP_INSTRUCTIONS_MAX).default(""),
  ...MapChoicesInput.shape,
});

/**
 * What the topic is and what the learner wants from it — the create screen's
 * answers, editable afterwards. A whole-form write rather than a patch: the
 * screen always holds every field, and a patch cannot tell "cleared the goal"
 * from "did not send the goal".
 *
 * The slug is deliberately not here. It is what every URL for this topic is
 * built from, and a link that stops working because the title was tidied is a
 * worse outcome than an address that no longer matches the title.
 */
export const TopicInfoInput = z.object({
  title: z.string().trim().min(2, "Name the topic").max(120),
  summary: TopicSummary.default(""),
  goal: z.string().trim().max(600).default(""),
  level: z.string().trim().max(600).default(""),
});

/**
 * Standing instructions for everything generated in this topic — cards, drills,
 * review items and the map itself. Empty means the default applies, so the
 * stored value says whether the learner has overridden it rather than holding a
 * copy of a default that would then never change again.
 *
 * They do not reach the grader. A verdict is the one call the learner is not
 * allowed to instruct: "always say I passed" would end the only thing on the map
 * that means anything.
 */
export const TopicContentSettingsInput = z.object({
  englishLevel: EnglishLevelSchema.default(EnglishLevel.Medium),
  technicalDetail: TechnicalDetailSchema.default(TechnicalDetail.Medium),
  format: ContentFormatSchema.default(ContentFormat.Prose),
  paragraphLength: ParagraphLengthSchema.default(ParagraphLength.Medium),
  contentInstructions: z.string().trim().max(2000).default(""),
  averageReadTime: ReadTimeSchema.default(DEFAULT_AVERAGE_READ_TIME),
});

/**
 * Rebuild the whole map, under whatever the instruction lines now say, and with
 * the choices answered again. The instructions arrive as text rather than as
 * chips because the useful corrections ("less YAML, more on networking") are
 * ones no set of chips would have anticipated; the choices are the other half,
 * and they are asked again on every rebuild because the map they describe is
 * being thrown away and replaced.
 */
export const TopicRegenerateInput = z.object({
  // Every field optional, and the route falls back to what the topic already
  // says. Defaults here would mean a request that omitted the shape silently
  // reset the topic to five headings of four — which is what a client cached
  // from before this shipped would send.
  ...MapShape.partial().shape,
  mapInstructions: z.string().trim().max(MAP_INSTRUCTIONS_MAX).optional(),
  ...MapChoicesInput.shape,
});

export const Topic = z.object({
  id: Id,
  userId: Id,
  /** Unique per user. Every URL for this topic is built from it, not from the id. */
  slug: Slug,
  title: z.string().min(1),
  /** One line for the topics list. Seeded from the goal, edited by the learner. */
  summary: z.string(),
  goal: z.string(),
  archetype: TopicArchetypeSchema,
  ...MapShape.shape,
  /** "" until the learner edits it, in which case the seed applies. */
  mapInstructions: z.string(),
  level: z.string(),
  /** How this topic is written: register, standing instructions, and length. */
  ...TopicContentSettings.shape,
  status: TopicStatusSchema,
  /** Null until generation finishes; surfaced verbatim when it fails. */
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type MapChoicesInputT = z.infer<typeof MapChoicesInput>;
export type TopicQuestionsInputT = z.infer<typeof TopicQuestionsInput>;
export type TopicCreateInputT = z.infer<typeof TopicCreateInput>;
export type TopicInfoInputT = z.infer<typeof TopicInfoInput>;
export type TopicContentSettingsT = z.infer<typeof TopicContentSettings>;
export type TopicContentSettingsInputT = z.infer<typeof TopicContentSettingsInput>;
export type TopicRegenerateInputT = z.infer<typeof TopicRegenerateInput>;
export type TopicT = z.infer<typeof Topic>;

/** The writing settings alone, out of the topic every generation call carries. */
export function contentSettingsOf(topic: TopicT): TopicContentSettingsT {
  return {
    englishLevel: topic.englishLevel,
    technicalDetail: topic.technicalDetail,
    format: topic.format,
    paragraphLength: topic.paragraphLength,
    contentInstructions: topic.contentInstructions,
    averageReadTime: topic.averageReadTime,
  };
}
