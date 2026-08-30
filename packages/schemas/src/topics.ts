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
  /** What they want to be able to do. Drives the critical path through the map. */
  goal: z.string().trim().max(300).default(""),
  timeBudget: TimeBudgetSchema.default(TimeBudget.Week),
  /** Adjacent things they already use — the highest-value calibration answer. */
  knownDomains: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

export const Topic = z.object({
  id: Id,
  userId: Id,
  title: z.string().min(1),
  goal: z.string(),
  archetype: TopicArchetypeSchema,
  timeBudget: TimeBudgetSchema,
  knownDomains: z.array(z.string()),
  status: TopicStatusSchema,
  /** Null until generation finishes; surfaced verbatim when it fails. */
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type TopicCreateInputT = z.infer<typeof TopicCreateInput>;
export type TopicT = z.infer<typeof Topic>;
