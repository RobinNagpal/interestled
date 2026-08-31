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
  goal: z.string(),
  archetype: TopicArchetypeSchema,
  timeBudget: TimeBudgetSchema,
  level: z.string(),
  levels: MapLevelsSchema,
  status: TopicStatusSchema,
  /** Null until generation finishes; surfaced verbatim when it fails. */
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type TopicCreateInputT = z.infer<typeof TopicCreateInput>;
export type TopicRegenerateInputT = z.infer<typeof TopicRegenerateInput>;
export type TopicT = z.infer<typeof Topic>;
