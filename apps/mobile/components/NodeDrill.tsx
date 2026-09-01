import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { router } from "expo-router";
import { useDrill, useSaveResume, useSubmitAttempt } from "@interestled/api";
import { topicHref } from "@interestled/domain";
import {
  Button,
  Card,
  ErrorState,
  InlineMarkdown,
  Input,
  LoadingContent,
  Markdown,
  SectionTitle,
  VerdictView,
  plainText,
} from "@interestled/ui";
import { DrillKind, MAX_RESPONSE_LENGTH } from "@interestled/schemas";
import type { LearningNodeT, TopicT, VerdictT } from "@interestled/schemas";
import { messageOf } from "../lib/errors";

/**
 * Production, not recognition. There is no timer here and no score: a clock on
 * thinking fills the working memory that comprehension needs, and a number
 * turns feedback into self-evaluation, which is the kind most likely to hurt.
 */
export function NodeDrill({ topic, node }: { topic: TopicT; node: LearningNodeT }): ReactElement {
  const drill = useDrill(node.id);
  const submit = useSubmitAttempt(topic.slug);
  const saveResume = useSaveResume();

  const [response, setResponse] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [verdict, setVerdict] = useState<VerdictT | null>(null);
  const [capability, setCapability] = useState("");

  if (drill.isPending) {
    return (
      <LoadingContent
        label={`Setting the drill for ${node.title}…`}
        hint="The first drill on a node is written for you, which takes 10–30 seconds. After that it is instant."
      />
    );
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
    // Written while typing, so leaving mid-sentence costs nothing and there is
    // never a reason to avoid starting. The restore point is keyed by topic id
    // rather than slug, because that is the row it belongs to.
    saveResume({
      topicId: topic.id,
      nodeId: node.id,
      drillId: task.id,
      draft: next,
      // Stripped of its marks: the resume card is one line of plain text, and
      // a stray "**" there is the app showing its working.
      lastThought: plainText(task.prompt).slice(0, 200),
    });
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
        <Card>
          <VerdictView items={verdict.items} />
        </Card>
        {verdict.passed ? (
          <InlineMarkdown
            text={`You can now ${lowerFirst(capability)}.`}
            className="text-base text-ink"
          />
        ) : null}
        <Button label="Back to the map" onPress={() => router.push(topicHref(topic.slug))} />
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

      <Markdown text={task.prompt} className="text-lg leading-7 text-ink" />
      <InlineMarkdown
        text={`Done when: ${task.completionTest}`}
        className="text-sm text-ink-faint"
      />

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
        <InlineMarkdown
          key={index}
          text={`Hint ${index + 1}: ${hint}`}
          className="text-sm text-ink-soft"
        />
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
