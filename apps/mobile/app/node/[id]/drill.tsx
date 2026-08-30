import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useDrill, useSaveResume, useSubmitAttempt } from "@interestled/api";
import { Button, ErrorState, Input, SectionTitle, Skeleton, VerdictView } from "@interestled/ui";
import { DrillKind, MAX_RESPONSE_LENGTH } from "@interestled/schemas";
import type { VerdictT } from "@interestled/schemas";
import { messageOf } from "../../../lib/errors";

/**
 * Production, not recognition. There is no timer here and no score: a clock on
 * thinking fills the working memory that comprehension needs, and a number
 * turns feedback into self-evaluation, which is the kind most likely to hurt.
 */
export default function DrillScreen(): ReactElement {
  const { id, topicId } = useLocalSearchParams<{ id: string; topicId?: string }>();
  const nodeId = id ?? "";
  const drill = useDrill(nodeId);
  const submit = useSubmitAttempt(topicId ?? "");
  const saveResume = useSaveResume();

  const [response, setResponse] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [verdict, setVerdict] = useState<VerdictT | null>(null);
  const [capability, setCapability] = useState("");

  if (drill.isPending) {
    return <Skeleton lines={5} />;
  }
  if (drill.isError) {
    return (
      <View className="p-4">
        <ErrorState message={messageOf(drill.error)} />
      </View>
    );
  }

  const task = drill.data;
  const isPredict = task.kind === DrillKind.Predict;

  const onType = (next: string): void => {
    setResponse(next);
    // Written on every keystroke, so leaving mid-sentence costs nothing and
    // there is never a reason to avoid starting.
    if (topicId !== undefined) {
      saveResume({
        topicId,
        nodeId,
        drillId: task.id,
        draft: next,
        lastThought: task.prompt.slice(0, 200),
      });
    }
  };

  const send = (): void => {
    submit.mutate(
      { drillId: task.id, response, hintsUsed: hintsShown },
      {
        onSuccess: (result) => {
          setVerdict(result.attempt.verdict);
          setCapability(result.capability);
        },
      },
    );
  };

  if (verdict !== null) {
    return (
      <ScrollView contentContainerClassName="gap-5 p-4">
        <SectionTitle>{verdict.passed ? "That holds up" : "Close — here is the gap"}</SectionTitle>
        {/* The diff, right things first, so the rest gets read. */}
        <View className="rounded-card bg-surface p-4">
          <VerdictView items={verdict.items} />
        </View>
        {verdict.passed ? (
          <Text className="text-base text-ink">You can now {lowerFirst(capability)}.</Text>
        ) : null}
        <Button
          label="Back to the map"
          onPress={() => router.push(topicId === undefined ? "/" : `/topic/${topicId}`)}
        />
        {verdict.passed ? null : (
          <Button
            label="Try again"
            tone="secondary"
            onPress={() => {
              setVerdict(null);
              setResponse("");
            }}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4">
      {/* Predict drills say so explicitly: the commitment is the point, and
          nothing here is scored. */}
      {isPredict ? (
        <Text className="text-sm text-ink-faint">
          Commit to an answer before the reveal. Guessing wrong is the useful part — this is
          never scored.
        </Text>
      ) : null}

      <Text className="text-lg leading-7 text-ink">{task.prompt}</Text>
      <Text className="text-sm text-ink-faint">Done when: {task.completionTest}</Text>

      <Input
        label="Your answer"
        value={response}
        onChangeText={onType}
        multiline
        autoFocus
        maxLength={MAX_RESPONSE_LENGTH}
        placeholder={isPredict ? "What do you think happens?" : "In your own words…"}
      />

      {/* Hints escalate rather than revealing. Each rung taken is a signal about
          how solid the node really is. */}
      {task.hints.slice(0, hintsShown).map((hint, index) => (
        <Text key={index} className="text-sm text-ink-soft">
          Hint {index + 1}: {hint}
        </Text>
      ))}
      {hintsShown < task.hints.length ? (
        <Pressable accessibilityRole="button" onPress={() => setHintsShown(hintsShown + 1)}>
          <Text className="text-sm text-accent underline">
            {hintsShown === 0 ? "Give me a nudge" : "Narrow it down"}
          </Text>
        </Pressable>
      ) : null}

      {submit.isError ? <ErrorState message={messageOf(submit.error)} /> : null}

      <Button
        label="Check it"
        onPress={send}
        busy={submit.isPending}
        disabled={response.trim().length === 0}
      />
    </ScrollView>
  );
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : text[0]!.toLowerCase() + text.slice(1);
}
