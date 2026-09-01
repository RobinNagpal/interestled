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
/**
 * How long one line of a sample may be.
 *
 * Generous, because the prompt asks two of the seven questions for whole
 * sentences — the first two sentences of a write-up, the opening of a worked
 * example — and a cap that a normal answer to the question overruns is not a
 * guard, it is a generation that fails every time somebody writes a long
 * sentence. It is still a cap: a sample is a line to be read at a glance, and
 * six of these is the most an option may carry.
 */
const SAMPLE_LINE_MAX = 500;

export const MapQuestionOption = z.object({
  label: z.string().trim().min(1).max(80),
  /** Rendered as Markdown, one line each. Never empty: the sample is the point. */
  sample: z.array(z.string().trim().min(1).max(SAMPLE_LINE_MAX)).min(1).max(6),
});

export const MapQuestion = z.object({
  kind: MapQuestionKindSchema,
  /**
   * One line, in the second person. It is a heading on the screen — but two of
   * the seven have to name the heading or the write-up they are about, so the
   * cap has room for a long title inside the sentence.
   */
  question: z.string().trim().min(1).max(240),
  options: z.array(MapQuestionOption).length(MAP_QUESTION_OPTIONS),
});

/**
 * All seven, once each — and then put in the order above rather than refused for
 * being in a different one.
 *
 * The completeness is load-bearing and the order is not. Answers are keyed by
 * kind, so a missing kind is a question the learner is never asked and a
 * repeated one is an answer that overwrites another; both have to fail. But the
 * order is only what the screen counts "3 of 7" through, and refusing a set that
 * has all seven because the model listed code before examples spends a whole
 * generation on something a sort fixes. The transform is what makes the order
 * true afterwards, so nothing downstream has to sort again.
 */
export const MapQuestionSet = z
  .array(MapQuestion)
  .length(MAP_QUESTION_COUNT)
  .superRefine((questions, ctx) => {
    const present = new Set(questions.map((question) => question.kind));
    const missing = MAP_QUESTION_KINDS.filter((kind) => !present.has(kind));
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `no question of kind ${missing.map((kind) => `"${kind}"`).join(", ")}`,
      });
    }
  })
  .transform((questions) => {
    const byKind = new Map(questions.map((question) => [question.kind, question]));
    return MAP_QUESTION_KINDS.flatMap((kind) => {
      const question = byKind.get(kind);
      return question === undefined ? [] : [question];
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
