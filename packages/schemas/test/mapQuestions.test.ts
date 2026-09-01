import { describe, expect, it } from "vitest";
import {
  MAP_QUESTION_KINDS,
  MapAnswers,
  MapQuestionKind,
  MapQuestionSet,
  answeredQuestions,
} from "../src/mapQuestions";
import type { MapQuestionT } from "../src/mapQuestions";

function question(kind: MapQuestionKind): MapQuestionT {
  return {
    kind,
    question: `A question about ${kind}`,
    options: [0, 1, 2, 3].map((index) => ({
      label: `Option ${index}`,
      sample: [`Sample ${index} for ${kind}`],
    })),
  };
}

const sevenQuestions = MAP_QUESTION_KINDS.map(question);

describe("MapQuestionSet", () => {
  it("takes all seven kinds in the order they are asked in", () => {
    expect(MapQuestionSet.safeParse(sevenQuestions).success).toBe(true);
  });

  it("names the kind that is missing, so the retry knows what to add", () => {
    const broken = [...sevenQuestions.slice(0, 6), question(MapQuestionKind.Outline)];
    const parsed = MapQuestionSet.safeParse(broken);
    expect(parsed.success).toBe(false);
    expect(parsed.success ? "" : parsed.error.issues.map((issue) => issue.message).join(" ")).toContain(
      '"opening"',
    );
  });

  it("refuses a set with a kind missing", () => {
    // Six questions and a repeat is the shape a model actually returns when it
    // loses count, and it is the worst one to accept: the answers are keyed by
    // kind, so the repeat overwrites and one question is never asked at all.
    const broken = [...sevenQuestions.slice(0, 6), question(MapQuestionKind.Outline)];
    expect(MapQuestionSet.safeParse(broken).success).toBe(false);
  });

  it("sorts the seven into asking order rather than refusing a different one", () => {
    // The completeness matters and the order does not: refusing a set that has
    // all seven because the model listed code before examples spends a whole
    // generation on something a sort fixes.
    const swapped = [sevenQuestions[1]!, sevenQuestions[0]!, ...sevenQuestions.slice(2)];
    const parsed = MapQuestionSet.safeParse(swapped);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.map((entry) => entry.kind)).toEqual([...MAP_QUESTION_KINDS]);
  });

  it("takes a sample line long enough for the two sentences it asks for", () => {
    // Question 7 asks for the first two sentences of a write-up, so a cap a
    // normal answer overruns is not a guard — it is a call that fails whenever
    // somebody writes a long sentence.
    const long = "a".repeat(420);
    const [first, ...rest] = sevenQuestions;
    const withLongSample = [
      { ...first!, options: first!.options.map((option) => ({ ...option, sample: [long] })) },
      ...rest,
    ];
    expect(MapQuestionSet.safeParse(withLongSample).success).toBe(true);
  });

  it("refuses a question with three options, or five", () => {
    const three = sevenQuestions.map((entry) => ({ ...entry, options: entry.options.slice(0, 3) }));
    expect(MapQuestionSet.safeParse(three).success).toBe(false);
  });

  it("refuses an option with no sample, because the sample is what is chosen", () => {
    const [first, ...rest] = sevenQuestions;
    const empty = [
      { ...first!, options: first!.options.map((option) => ({ ...option, sample: [] })) },
      ...rest,
    ];
    expect(MapQuestionSet.safeParse(empty).success).toBe(false);
  });
});

describe("MapAnswers", () => {
  it("takes fewer than seven, because a question may be skipped", () => {
    const parsed = MapAnswers.safeParse([
      { kind: MapQuestionKind.Outline, optionIndexes: [2] },
    ]);
    expect(parsed.success).toBe(true);
  });

  it("takes all four options at once, because the four are not exclusive", () => {
    // Two cuts of a subject can both be wanted and blended; two ways code could
    // appear can both be welcome. Forcing one throws away half of what was meant.
    const parsed = MapAnswers.safeParse([
      { kind: MapQuestionKind.Outline, optionIndexes: [0, 1, 2, 3] },
    ]);
    expect(parsed.success).toBe(true);
  });

  it("refuses an answer that picked nothing, because that is a skip", () => {
    // A skip is the answer being absent. Present-and-empty would be a second way
    // of saying the same thing, and the two would drift apart.
    expect(MapAnswers.safeParse([{ kind: MapQuestionKind.Known, optionIndexes: [] }]).success).toBe(
      false,
    );
  });

  it("refuses the same option picked twice", () => {
    expect(
      MapAnswers.safeParse([{ kind: MapQuestionKind.Known, optionIndexes: [1, 1] }]).success,
    ).toBe(false);
  });

  it("refuses two answers to the same question", () => {
    const parsed = MapAnswers.safeParse([
      { kind: MapQuestionKind.Outline, optionIndexes: [0] },
      { kind: MapQuestionKind.Outline, optionIndexes: [1] },
    ]);
    expect(parsed.success).toBe(false);
  });

  it("refuses an option that is not one of the four", () => {
    expect(
      MapAnswers.safeParse([{ kind: MapQuestionKind.Known, optionIndexes: [4] }]).success,
    ).toBe(false);
  });
});

describe("answeredQuestions", () => {
  it("resolves every pick against the question it was shown for", () => {
    const answered = answeredQuestions(sevenQuestions, [
      { kind: MapQuestionKind.Known, optionIndexes: [2, 0] },
      { kind: MapQuestionKind.Outline, optionIndexes: [0] },
    ]);
    // In the order the questions were asked, not the order they came back in.
    expect(answered.map((entry) => entry.kind)).toEqual([
      MapQuestionKind.Outline,
      MapQuestionKind.Known,
    ]);
    // And each question's picks in the order they were shown, not the order tapped.
    expect(answered[1]?.picked.map((option) => option.label)).toEqual([
      "Option 0",
      "Option 2",
    ]);
  });

  it("carries what was passed over, which is the other half of the answer", () => {
    // "These five headings rather than those five" says more than the five
    // alone: without the rejected ones the model is free to build the very cut
    // the learner just turned down.
    const answered = answeredQuestions(sevenQuestions, [
      { kind: MapQuestionKind.Outline, optionIndexes: [1] },
    ]);
    expect(answered[0]?.picked.map((option) => option.label)).toEqual(["Option 1"]);
    expect(answered[0]?.passedOver.map((option) => option.label)).toEqual([
      "Option 0",
      "Option 2",
      "Option 3",
    ]);
  });

  it("leaves nothing passed over when all four were picked", () => {
    const answered = answeredQuestions(sevenQuestions, [
      { kind: MapQuestionKind.Outline, optionIndexes: [0, 1, 2, 3] },
    ]);
    expect(answered[0]?.picked).toHaveLength(4);
    expect(answered[0]?.passedOver).toEqual([]);
  });

  it("leaves a skipped question out entirely rather than filling in a default", () => {
    expect(answeredQuestions(sevenQuestions, [])).toEqual([]);
  });

  it("drops an answer to a question this set does not contain", () => {
    // The questions were regenerated under the learner. Six of their seven
    // answers still build a map; refusing to build one at all does not.
    const outlineOnly = [sevenQuestions[0]!];
    const answered = answeredQuestions(outlineOnly, [
      { kind: MapQuestionKind.Outline, optionIndexes: [1] },
      { kind: MapQuestionKind.Recap, optionIndexes: [1] },
    ]);
    expect(answered).toHaveLength(1);
    expect(answered[0]?.kind).toBe(MapQuestionKind.Outline);
  });

  it("treats an index past the end of the options as not picked", () => {
    const answered = answeredQuestions(sevenQuestions, [
      { kind: MapQuestionKind.Outline, optionIndexes: [0, 9] },
    ]);
    expect(answered[0]?.picked.map((option) => option.label)).toEqual(["Option 0"]);
  });
});
