import { z } from "zod";
import { Id } from "./ids";

export enum DrillKind {
  /** "Say it in your own words." Advances Seen → Explained. */
  ExplainBack = "explain_back",
  /** Commit to a guess before the reveal. Never scored. */
  Predict = "predict",
  /** Use the idea on a case it has not been used on. Advances → Verified. */
  Apply = "apply",
}

export const DrillKindSchema = z.nativeEnum(DrillKind);

export const Drill = z.object({
  id: Id,
  nodeId: Id,
  kind: DrillKindSchema,
  prompt: z.string().min(1).max(1000),
  /** Stated in the prompt so being finished is a fact, not a feeling (A3). */
  completionTest: z.string().min(1).max(300),
  /**
   * The points a correct answer contains. Grading compares against this rather
   * than free-judging, which keeps verdicts consistent between nodes.
   */
  referencePoints: z.array(z.string().min(1).max(300)).min(1).max(8),
  /** Nudge, then narrow, then reveal. Rungs taken are a signal about the node. */
  hints: z.array(z.string().min(1).max(300)).max(3),
  createdAt: z.coerce.date(),
});

/** How one reference point fared in the learner's answer. */
export enum VerdictLabel {
  Got = "got",
  Vague = "vague",
  Missing = "missing",
  Wrong = "wrong",
}

export const VerdictLabelSchema = z.nativeEnum(VerdictLabel);

export const VerdictItem = z.object({
  label: VerdictLabelSchema,
  point: z.string().min(1).max(300),
  /** Only for vague/missing/wrong. Usable in the next ten seconds, not a grade. */
  note: z.string().max(400).default(""),
});

export const Verdict = z.object({
  items: z.array(VerdictItem).min(1).max(8),
  /**
   * Whether the answer was good enough to advance the node. Deliberately a
   * boolean rather than a score: a number invites self-evaluation, which is the
   * category of feedback most likely to hurt (A17).
   */
  passed: z.boolean(),
  /** Named in the learner's own words, so the next card can target it. */
  misconception: z.string().max(300).default(""),
});

/** Shared so the client can stop typing at the same point the server refuses. */
export const MAX_RESPONSE_LENGTH = 4000;

export const AttemptInput = z.object({
  drillId: Id,
  response: z.string().trim().min(1, "Write something first").max(MAX_RESPONSE_LENGTH),
  hintsUsed: z.number().int().min(0).max(3).default(0),
});

export const Attempt = z.object({
  id: Id,
  drillId: Id,
  userId: Id,
  response: z.string(),
  verdict: Verdict,
  hintsUsed: z.number().int().min(0),
  createdAt: z.coerce.date(),
});

export type DrillT = z.infer<typeof Drill>;
export type VerdictItemT = z.infer<typeof VerdictItem>;
export type VerdictT = z.infer<typeof Verdict>;
export type AttemptInputT = z.infer<typeof AttemptInput>;
export type AttemptT = z.infer<typeof Attempt>;
