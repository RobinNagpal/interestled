import { z } from "zod";
import { Id } from "./ids";

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
});

export const Topic = z.object({
  id: Id,
  userId: Id,
  title: z.string().min(1),
  goal: z.string(),
  archetype: TopicArchetypeSchema,
  timeBudget: TimeBudgetSchema,
  level: z.string(),
  status: TopicStatusSchema,
  /** Null until generation finishes; surfaced verbatim when it fails. */
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type TopicCreateInputT = z.infer<typeof TopicCreateInput>;
export type TopicT = z.infer<typeof Topic>;
