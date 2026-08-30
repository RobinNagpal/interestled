import { z } from "zod";
import { Id } from "./ids";

export enum AtomKind {
  Cloze = "cloze",
  Reverse = "reverse",
  Application = "application",
  Production = "production",
}

export const AtomKindSchema = z.nativeEnum(AtomKind);

/** One retrieval item, extracted when its card is generated rather than later. */
export const Atom = z.object({
  id: Id,
  nodeId: Id,
  userId: Id,
  kind: AtomKindSchema,
  prompt: z.string().min(1).max(500),
  answer: z.string().min(1).max(500),
  /** Days until the next showing. Widens on success, collapses on failure. */
  intervalDays: z.number().int().min(0),
  ease: z.number().min(1.3).max(3),
  lapses: z.number().int().min(0),
  dueAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export const GeneratedAtom = z.object({
  kind: AtomKindSchema,
  prompt: z.string().min(1).max(500),
  answer: z.string().min(1).max(500),
});

/**
 * Self-graded, two options only. More buttons means a decision on every card,
 * and the review session is where decisions cost the most.
 */
export enum ReviewGrade {
  Missed = "missed",
  Recalled = "recalled",
}

export const ReviewGradeSchema = z.nativeEnum(ReviewGrade);

export const ReviewInput = z.object({ atomId: Id, grade: ReviewGradeSchema });

export type AtomT = z.infer<typeof Atom>;
export type GeneratedAtomT = z.infer<typeof GeneratedAtom>;
export type ReviewInputT = z.infer<typeof ReviewInput>;
