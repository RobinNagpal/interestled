import { z } from "zod";
import { Id } from "./ids";

/**
 * A restore point, not a summary. Re-entry shows the question and the
 * half-written answer, because the cost of rebuilding where you were is what
 * decides whether someone comes back (W12).
 */
export const ResumePoint = z.object({
  nodeId: Id,
  drillId: Id.nullable(),
  /** Saved on every keystroke, so leaving mid-sentence costs nothing. */
  draft: z.string().max(4000),
  /** One line of what they had just worked out. Beats a progress summary. */
  lastThought: z.string().max(300),
  updatedAt: z.coerce.date(),
});

export const StudySession = z.object({
  id: Id,
  userId: Id,
  topicId: Id,
  /** "12 minutes, 4 nodes, and you'll be able to …" — stated before starting. */
  contract: z.string().min(1).max(300),
  plannedMinutes: z.number().int().min(1).max(120),
  nodesCompleted: z.number().int().min(0),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
});

/** What the learner keeps at the end: abilities gained, not material covered. */
export const SessionSummary = z.object({
  session: StudySession,
  capabilities: z.array(z.string()),
  gotWrong: z.array(z.string()),
  nextNodes: z.array(z.object({ id: Id, title: z.string(), minutes: z.number() })),
});

export type ResumePointT = z.infer<typeof ResumePoint>;
export type StudySessionT = z.infer<typeof StudySession>;
export type SessionSummaryT = z.infer<typeof SessionSummary>;
