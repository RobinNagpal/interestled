import { z } from "zod";
import { Id } from "./ids";

/** Shared with the app, so the box stops where the server would refuse. */
export const QUESTION_MAX = 500;

/**
 * One paragraph, at most. The prompt asks for the card's own paragraph length,
 * and this is the outer bound on a runaway answer rather than the size of an
 * ordinary one — the same relationship CardContent has to the read time.
 */
export const ANSWER_MAX = 2000;

/**
 * A question asked on a card, in the learner's words, and what it was answered
 * with. Kept with the node, so the next open of the card shows what was asked
 * on it: a question answered and then lost is the glossary problem again, a
 * trip somewhere that has to be made twice (A12).
 *
 * The answer is Markdown, like everything else the model writes.
 */
export const CardQuestion = z.object({
  id: Id,
  nodeId: Id,
  question: z.string().min(1).max(QUESTION_MAX),
  answer: z.string().min(1).max(ANSWER_MAX),
  createdAt: z.coerce.date(),
});

export const CardQuestionInput = z.object({
  question: z.string().trim().min(1, "Ask something first").max(QUESTION_MAX),
});

/** The model's reply: the answer and nothing else. */
export const CardAnswer = z.object({
  answer: z.string().min(1).max(ANSWER_MAX),
});

export type CardQuestionT = z.infer<typeof CardQuestion>;
export type CardQuestionInputT = z.infer<typeof CardQuestionInput>;
export type CardAnswerT = z.infer<typeof CardAnswer>;
