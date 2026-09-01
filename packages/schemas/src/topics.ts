import { z } from "zod";
import { Id } from "./ids";
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

/** How much time the learner has. Sets map size, not depth. */
export enum TimeBudget {
  Quick = "quick",
  Week = "week",
  Ongoing = "ongoing",
}

export const TimeBudgetSchema = z.nativeEnum(TimeBudget);

/** Map generation is one LLM call, so a topic is briefly incomplete. */
export enum TopicStatus {
  Generating = "generating",
  Ready = "ready",
  Failed = "failed",
}

export const TopicStatusSchema = z.nativeEnum(TopicStatus);

/**
 * How many levels the map is built with. Two is groups of nodes; three adds an
 * area above the groups, which only earns its keep on a subject wide enough that
 * the level-1 list would otherwise be unreadable. Two is the default because the
 * map's job is to be seen whole in one screen, and a third level trades that
 * away for detail nobody asked for yet.
 *
 * Numeric on purpose: the value is also the depth a node may reach, so
 * `depth <= topic.levels` is the whole structural invariant.
 */
export enum MapLevels {
  Two = 2,
  Three = 3,
}

export const MapLevelsSchema = z.nativeEnum(MapLevels);

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
 * How a topic is written: how many words, whose words, and — for the last one —
 * whether it is prose at all. That is what people mean when they say a subject
 * was explained badly, and it applies to French verbs as squarely as to
 * Kubernetes, which is why the choice is the same on every topic.
 *
 * It is not the depth control. Depth (1-5, on the card itself) decides how far
 * down the mechanism the explanation goes and follows the learner across every
 * topic; this decides the register and the length it is written at, and stays
 * with the topic. A learner can want the full mechanism in plain words, or a
 * crisp technical note — the two questions do not answer each other.
 *
 * Nor is it the profile's learning styles, which shape what the explanation is
 * built out of — examples, analogies, a story. Those stay account-wide, because
 * they are true of the learner rather than of the subject.
 *
 * The order here is the order of the chips.
 */
export enum ContentStyle {
  /** The shortest thing that answers it. */
  ShortAndCrisp = "short_and_crisp",
  /** As short, but assuming the vocabulary. */
  ShortAndTechnical = "short_and_technical",
  /** All the way to the mechanism, in everyday words. */
  PlainAndDeep = "plain_and_deep",
  /** All the way to the mechanism, in the field's own terms. */
  TechnicalAndDeep = "technical_and_deep",
  /** Written to be looked up rather than read through. */
  ReferenceNotes = "reference_notes",
}

export const ContentStyleSchema = z.nativeEnum(ContentStyle);

/**
 * Everything that decides how this topic is written, as one object, because
 * every generation call needs all three and a call that quietly got two of them
 * would produce content the settings screen says it did not ask for.
 */
export const TopicContentSettings = z.object({
  style: ContentStyleSchema,
  /** "" means the default applies; see TopicContentSettingsInput. */
  contentInstructions: z.string(),
  averageReadTime: ReadTimeSchema,
});

export const TopicCreateInput = z.object({
  title: z.string().trim().min(2, "Name the topic").max(120),
  /**
   * What they want to be able to do, as up to three points. Free text rather
   * than a list of strings: people write "debug it when it breaks" in one line
   * and three separate boxes would only make that harder to say.
   */
  goal: z.string().trim().max(600).default(""),
  timeBudget: TimeBudgetSchema.default(TimeBudget.Week),
  /**
   * Where they are now and where they want to get to, in 3-5 points. This
   * replaced "what related things do you already use": the same calibration
   * value — what to skip, which comparisons land — plus the target, which
   * decides where the map is allowed to stop.
   */
  level: z.string().trim().max(600).default(""),
  /** Asked in a sheet on the way to generation, so the choice is never a surprise. */
  levels: MapLevelsSchema.default(MapLevels.Two),
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
  timeBudget: TimeBudgetSchema.default(TimeBudget.Week),
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
  style: ContentStyleSchema.default(ContentStyle.ShortAndCrisp),
  contentInstructions: z.string().trim().max(2000).default(""),
  averageReadTime: ReadTimeSchema.default(DEFAULT_AVERAGE_READ_TIME),
});

/**
 * Rebuild the whole map, optionally under new instructions and at a new number
 * of levels. The instructions are free text because the useful ones are
 * corrections ("too much YAML, more on networking") that no set of chips would
 * have anticipated.
 */
export const TopicRegenerateInput = z.object({
  instructions: z.string().trim().max(600).default(""),
  levels: MapLevelsSchema.optional(),
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
  timeBudget: TimeBudgetSchema,
  level: z.string(),
  levels: MapLevelsSchema,
  /** How this topic is written: style, standing instructions, and length. */
  ...TopicContentSettings.shape,
  status: TopicStatusSchema,
  /** Null until generation finishes; surfaced verbatim when it fails. */
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type TopicCreateInputT = z.infer<typeof TopicCreateInput>;
export type TopicInfoInputT = z.infer<typeof TopicInfoInput>;
export type TopicContentSettingsT = z.infer<typeof TopicContentSettings>;
export type TopicContentSettingsInputT = z.infer<typeof TopicContentSettingsInput>;
export type TopicRegenerateInputT = z.infer<typeof TopicRegenerateInput>;
export type TopicT = z.infer<typeof Topic>;

/** The writing settings alone, out of the topic every generation call carries. */
export function contentSettingsOf(topic: TopicT): TopicContentSettingsT {
  return {
    style: topic.style,
    contentInstructions: topic.contentInstructions,
    averageReadTime: topic.averageReadTime,
  };
}
