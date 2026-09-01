import { useState } from "react";
import { Pressable, View } from "react-native";
import type { ReactElement } from "react";
import { Button, InlineMarkdown, Markdown, SectionTitle, Text } from "@interestled/ui";
import type { MapAnswerT, MapQuestionOptionT, MapQuestionT } from "@interestled/schemas";

/**
 * The seven choices, one at a time.
 *
 * They exist because the create form says what someone wants and not what the
 * map should look like, and the model's first guess at the second thing is the
 * one decision nobody gets to correct until the whole map is built and wrong.
 * Four samples side by side is a decision anyone can make in two seconds and
 * nobody could have written down.
 *
 * One question per screen, and every one skippable. Seven mandatory questions
 * between "I want to learn this" and the map would be exactly the setup cost
 * A14 bans — and a skipped question is genuinely absent from the prompt rather
 * than answered with a default nobody chose.
 */
export function MapQuestions({
  questions,
  finishLabel,
  busy,
  onFinish,
}: {
  questions: readonly MapQuestionT[];
  /** What the last button says — "Build the map", or "Build it again". */
  finishLabel: string;
  busy: boolean;
  onFinish: (answers: MapAnswerT[]) => void;
}): ReactElement {
  // One step past the last question is the summary, which is where the finish
  // button lives — so nobody builds a map by tapping an option they misread.
  const summary = questions.length;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<MapAnswerT[]>([]);
  // Set when a question is reopened from the summary, so answering it goes back
  // there rather than walking through every question after it a second time.
  const [returning, setReturning] = useState(false);

  const answerFor = (question: MapQuestionT): number | null =>
    answers.find((answer) => answer.kind === question.kind)?.optionIndex ?? null;

  const advance = (): void => {
    setStep((current) => (returning ? summary : current + 1));
    setReturning(false);
  };

  const choose = (question: MapQuestionT, optionIndex: number): void => {
    setAnswers((current) => [
      ...current.filter((answer) => answer.kind !== question.kind),
      { kind: question.kind, optionIndex },
    ]);
    advance();
  };

  const skip = (question: MapQuestionT): void => {
    setAnswers((current) => current.filter((answer) => answer.kind !== question.kind));
    advance();
  };

  const reopen = (at: number): void => {
    setReturning(true);
    setStep(at);
  };

  /**
   * Straight to the summary, with everything from here on left unanswered.
   * Without it the learner who has said what they care about has to tap "Skip
   * this one" four more times to get to the button, which is the same setup cost
   * making every question skippable was meant to avoid.
   */
  const skipRest = (): void => {
    const remaining = new Set(questions.slice(step).map((entry) => entry.kind));
    setAnswers((current) => current.filter((answer) => !remaining.has(answer.kind)));
    setReturning(false);
    setStep(summary);
  };

  const question = questions[step];
  if (question === undefined) {
    return (
      <View className="gap-4">
        <SectionTitle>What you picked</SectionTitle>
        {questions.map((entry, index) => {
          const chosen = answerFor(entry);
          const option = chosen === null ? undefined : entry.options[chosen];
          return (
            <Pressable
              key={entry.kind}
              accessibilityRole="button"
              accessibilityLabel={`Change your answer: ${entry.question}`}
              disabled={busy}
              onPress={() => reopen(index)}
              className="gap-1 border-b border-line pb-3"
            >
              {/* Both lines are model-written, so both are Markdown. */}
              <InlineMarkdown text={entry.question} className="text-xs text-ink-faint" />
              {option === undefined ? (
                <Text className="text-sm text-ink-faint">Skipped</Text>
              ) : (
                <InlineMarkdown text={option.label} className="text-sm text-ink" />
              )}
            </Pressable>
          );
        })}
        <Button label={finishLabel} onPress={() => onFinish(answers)} busy={busy} />
      </View>
    );
  }

  const selected = answerFor(question);
  return (
    <View className="gap-4">
      <View className="gap-1">
        <SectionTitle>{`${step + 1} of ${questions.length}`}</SectionTitle>
        <InlineMarkdown text={question.question} className="text-base font-medium text-ink" />
      </View>

      <View className="gap-3">
        {question.options.map((option, index) => (
          <OptionCard
            key={`${question.kind}-${index}`}
            option={option}
            selected={selected === index}
            onPress={() => choose(question, index)}
          />
        ))}
      </View>

      <View className="flex-row gap-2">
        {step > 0 || returning ? (
          <View className="flex-1">
            <Button
              label="Back"
              tone="secondary"
              onPress={() => {
                setStep(returning ? summary : step - 1);
                setReturning(false);
              }}
            />
          </View>
        ) : null}
        <View className="flex-1">
          <Button label="Skip this one" tone="secondary" onPress={() => skip(question)} />
        </View>
      </View>

      {step < summary - 1 && !returning ? (
        <Button label="Skip the rest" tone="secondary" onPress={skipRest} />
      ) : null}
    </View>
  );
}

/**
 * One option: the label, and the sample under it. The sample is the taller half
 * on purpose — it is the thing being chosen, and the label is only there so the
 * summary has something to say afterwards.
 *
 * Both are model-written, so both go through the Markdown components: a sample
 * of code is written in backticks, and a plain `<Text>` would put the backticks
 * on the screen.
 */
function OptionCard({
  option,
  selected,
  onPress,
}: {
  option: MapQuestionOptionT;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
      onPress={onPress}
      className={`gap-2 rounded-card border p-3 ${
        selected ? "border-accent bg-accent-tint" : "border-line-strong bg-surface"
      }`}
    >
      <InlineMarkdown text={option.label} className="text-sm font-semibold text-ink" />
      <View className="gap-1">
        {option.sample.map((line, index) => (
          <Markdown key={index} text={line} className="text-sm text-ink-soft" />
        ))}
      </View>
    </Pressable>
  );
}
