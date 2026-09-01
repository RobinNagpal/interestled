import { z } from "zod";
import { Id } from "./ids";

/**
 * The seven questions asked between the create form and the map.
 *
 * The form says what the learner wants; it does not say what the map should
 * look like, and the model's first guess at that is the one thing nobody gets to
 * correct until the whole map is built and wrong. So the model guesses four
 * times, in the open, and the learner picks — which is a decision they can make
 * in a second and could not have written down in a sentence.
 *
 * The kinds are an enum rather than free text because the set is what makes the
 * questions comparable: seven questions, always these seven, always in this
 * order, so the screen can say "3 of 7" honestly and the prompt knows what each
 * answer is an answer to. A model returning six of them, or two of one, fails
 * the parse rather than producing a map built on a question nobody asked.
 */
export enum MapQuestionKind {
  /** Four candidate sets of top-level headings — the shape of the whole map. */
  Outline = "outline",
  /** Four ways to break down the largest heading in the chosen outline. */
  Breakdown = "breakdown",
  /** Four things the map could leave out, so it can stop somewhere. */
  Scope = "scope",
  /** Four flavours of worked example, shown as examples rather than named. */
  Examples = "examples",
  /** Whether code appears, and in what form. Four samples of it. */
  Code = "code",
  /** Whether numbers and formulas appear, and how far they are worked. */
  Numbers = "numbers",
  /** Four openings for the same node, so the register is chosen by reading it. */
  Opening = "opening",
}

export const MapQuestionKindSchema = z.nativeEnum(MapQuestionKind);

/**
 * The order they are asked in, and the whole set. Outline first because every
 * later question is about the map that answer describes: what the biggest
 * heading breaks into, what gets left out of it, and how the nodes inside it
 * read.
 */
export const MAP_QUESTION_KINDS: readonly MapQuestionKind[] = [
  MapQuestionKind.Outline,
  MapQuestionKind.Breakdown,
  MapQuestionKind.Scope,
  MapQuestionKind.Examples,
  MapQuestionKind.Code,
  MapQuestionKind.Numbers,
  MapQuestionKind.Opening,
];

/** Seven. Named rather than written out, so the screen and the parse agree. */
export const MAP_QUESTION_COUNT = MAP_QUESTION_KINDS.length;

/** Four options per question: enough to be a real choice, few enough to read. */
export const MAP_QUESTION_OPTIONS = 4;

/**
 * One option. `label` is the answer in a few words, and `sample` is the thing
 * itself — the headings, the example, the opening sentence — because a learner
 * can tell in two seconds which of four samples they want and cannot answer
 * "how technical should the examples be" at all.
 */
export const MapQuestionOption = z.object({
  label: z.string().trim().min(1).max(80),
  /** Rendered as Markdown, one line each. Never empty: the sample is the point. */
  sample: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
});

export const MapQuestion = z.object({
  kind: MapQuestionKindSchema,
  /** One line, in the second person. It is a heading on the screen. */
  question: z.string().trim().min(1).max(160),
  options: z.array(MapQuestionOption).length(MAP_QUESTION_OPTIONS),
});

/**
 * All seven, once each, in the order above. A plain array schema would let the
 * model drop the outline question and send two about code, and nothing
 * downstream would notice — the answers are keyed by kind, so a missing kind is
 * a question the learner is never asked and a repeated one is an answer that
 * overwrites another.
 */
export const MapQuestionSet = z
  .array(MapQuestion)
  .length(MAP_QUESTION_COUNT)
  .superRefine((questions, ctx) => {
    MAP_QUESTION_KINDS.forEach((kind, index) => {
      if (questions[index]?.kind !== kind) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "kind"],
          message: `question ${index + 1} must have kind "${kind}"`,
        });
      }
    });
  });

/**
 * One answer: which of the four. By position rather than by a key the model
 * invented — the option list is fixed at four and stored beside the answer, so
 * the index is the whole of the reference and there is no key to come back
 * malformed or repeated.
 */
export const MapAnswer = z.object({
  kind: MapQuestionKindSchema,
  optionIndex: z.number().int().min(0).max(MAP_QUESTION_OPTIONS - 1),
});

/**
 * What the learner chose. Shorter than seven on purpose: a question can be
 * skipped, and a skipped question reaches the prompt as nothing at all rather
 * than as a default somebody has to guess the meaning of. Seven mandatory
 * questions between "I want to learn this" and the map is the setup cost A14
 * bans.
 */
export const MapAnswers = z
  .array(MapAnswer)
  .max(MAP_QUESTION_COUNT)
  .superRefine((answers, ctx) => {
    const seen = new Set<MapQuestionKind>();
    answers.forEach((answer, index) => {
      if (seen.has(answer.kind)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "kind"],
          message: `answered "${answer.kind}" twice`,
        });
      }
      seen.add(answer.kind);
    });
  });

/**
 * The questions as the client gets them: the row they were saved as, and the
 * questions themselves. The id comes back with the answers, so the server pairs
 * an answer with the question it was actually shown rather than with whatever
 * the model would generate the second time round.
 */
export const MapPlanView = z.object({
  planId: Id,
  questions: MapQuestionSet,
});

export type MapQuestionOptionT = z.infer<typeof MapQuestionOption>;
export type MapQuestionT = z.infer<typeof MapQuestion>;
export type MapAnswerT = z.infer<typeof MapAnswer>;
export type MapAnswersT = z.infer<typeof MapAnswers>;
export type MapPlanViewT = z.infer<typeof MapPlanView>;

/** A question and the option taken, which is what the map prompt is written from. */
export interface ChosenOptionT {
  kind: MapQuestionKind;
  question: string;
  label: string;
  sample: readonly string[];
}

/**
 * The answers resolved against the questions they were given for, in the order
 * the questions were asked. An answer naming a kind that is not in this set is
 * dropped rather than failing: it means the questions were regenerated under
 * the learner, and building the map from six of their seven answers beats
 * refusing to build it at all.
 */
export function chosenOptions(
  questions: readonly MapQuestionT[],
  answers: readonly MapAnswerT[],
): ChosenOptionT[] {
  const byKind = new Map(answers.map((answer) => [answer.kind, answer.optionIndex]));
  return questions.flatMap((question) => {
    const index = byKind.get(question.kind);
    const option = index === undefined ? undefined : question.options[index];
    return option === undefined
      ? []
      : [
          {
            kind: question.kind,
            question: question.question,
            label: option.label,
            sample: option.sample,
          },
        ];
  });
}
