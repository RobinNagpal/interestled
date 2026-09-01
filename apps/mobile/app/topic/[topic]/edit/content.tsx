import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTopic, useTopicDefaults, useUpdateTopicContentSettings } from "@interestled/api";
import { editHref } from "@interestled/domain";
import { Button, ErrorState, Input, LoadingContent, SectionTitle } from "@interestled/ui";
import { ContentStyle, READ_TIMES, ReadTimeSchema } from "@interestled/schemas";
import type { TopicContentSettingsT, TopicT } from "@interestled/schemas";
import { messageOf } from "../../../../lib/errors";
import { backHeader, goBack } from "../../../../lib/nav";
import { ChipRow } from "../../../../components/ChipRow";

/**
 * The three styles as a choice rather than as the instruction the model gets
 * (CONTENT_STYLE_GUIDE, server side). A chip reading "technical_and_deep" would
 * be asking the learner to guess what it does.
 */
const STYLE_COPY: Record<ContentStyle, { label: string; body: string }> = {
  [ContentStyle.ShortAndCrisp]: {
    label: "Short and crisp",
    body: "The shortest thing that answers it. One example, nothing said twice.",
  },
  [ContentStyle.ShortAndTechnical]: {
    label: "Short, technical",
    body: "As short, but assuming you know the words. The answer without the introduction.",
  },
  [ContentStyle.PlainAndDeep]: {
    label: "Plain, in depth",
    body: "All the way down to how it works, in everyday words. Jargon replaced or explained where it first appears.",
  },
  [ContentStyle.TechnicalAndDeep]: {
    label: "Technical, in depth",
    body: "All the way down, in the field's own terms, used precisely.",
  },
  [ContentStyle.ReferenceNotes]: {
    label: "Reference notes",
    body: "Written to be looked up rather than read through: the rule, when it holds, and the real values, each on its own.",
  },
};

/** Keyed by the enum, so a style added without copy fails the build rather than the screen. */
const STYLE_OPTIONS = Object.values(ContentStyle).map((value) => ({
  value,
  label: STYLE_COPY[value].label,
}));

/** The ladder itself, so the chips and what a node may claim cannot drift apart. */
const READ_TIME_OPTIONS = READ_TIMES.map((minutes) => ({
  value: String(minutes),
  label: `${minutes} min`,
}));

/**
 * How this topic is written. All three settings are read by every generation
 * inside it — the map, every card, every drill, every review item — so an answer
 * given here keeps paying, instead of being retyped into the instructions box on
 * each rebuild. None of them reaches the grader; see TopicContentSettingsInput.
 */
export default function EditContentScreen(): ReactElement {
  const { topic: slug } = useLocalSearchParams<{ topic: string }>();
  const topicSlug = slug ?? "";
  const topic = useTopic(topicSlug);
  const defaults = useTopicDefaults();

  const header = (
    <Stack.Screen
      options={{ title: "How it is written", headerLeft: backHeader(editHref(topicSlug)) }}
    />
  );

  // The form needs both: the topic's own settings, and the default to show while
  // it has none of its own.
  const failure = topic.error ?? defaults.error;
  if (failure !== null) {
    return (
      <View className="p-4">
        {header}
        <ErrorState message={messageOf(failure)} />
      </View>
    );
  }
  if (topic.data === undefined || defaults.data === undefined) {
    return (
      <>
        {header}
        <LoadingContent label="Opening the settings…" lines={5} />
      </>
    );
  }

  return (
    <>
      {header}
      <ContentForm
        key={topic.data.topic.id}
        topicSlug={topicSlug}
        topic={topic.data.topic}
        defaults={defaults.data}
      />
    </>
  );
}

function ContentForm({
  topicSlug,
  topic,
  defaults,
}: {
  topicSlug: string;
  topic: TopicT;
  defaults: TopicContentSettingsT;
}): ReactElement {
  const save = useUpdateTopicContentSettings(topicSlug);
  const [style, setStyle] = useState<ContentStyle>(topic.style);
  const [averageReadTime, setAverageReadTime] = useState(topic.averageReadTime);
  const [instructions, setInstructions] = useState(topic.contentInstructions);

  const usingDefault = instructions.trim() === "";

  const submit = (): void => {
    save.mutate(
      { style, averageReadTime, contentInstructions: instructions },
      // Back to the hub, not another copy of it pushed on top.
      { onSuccess: () => goBack(editHref(topicSlug)) },
    );
  };

  return (
    <ScrollView contentContainerClassName="gap-5 p-4">
      <View className="gap-2">
        <SectionTitle>Style</SectionTitle>
        <ChipRow options={STYLE_OPTIONS} selected={style} onSelect={(value) => setStyle(value)} />
        <Text className="text-sm text-ink-soft">{STYLE_COPY[style].body}</Text>
      </View>

      <View className="gap-2">
        <SectionTitle>How long one node should take</SectionTitle>
        <ChipRow
          options={READ_TIME_OPTIONS}
          selected={String(averageReadTime)}
          onSelect={(value) => setAverageReadTime(ReadTimeSchema.parse(Number(value)))}
        />
        <Text className="text-sm text-ink-soft">
          The map is built to nodes about this long. A card is written to match, up to about four
          minutes of reading — past that the extra time is the drill and the doing, not more card.
        </Text>
      </View>

      <View className="gap-2">
        <SectionTitle>Standing instructions</SectionTitle>
        <Input
          label="Anything that should hold for everything written here"
          value={instructions}
          onChangeText={setInstructions}
          multiline
          maxLength={2000}
          placeholder={"No YAML in the examples\nUse examples from finance\nAnswers in French"}
          hint={
            usingDefault
              ? "Empty means the default below is in force."
              : "Used instead of the default, on every card, drill and review item in this topic."
          }
        />
        {usingDefault ? (
          <View className="gap-2 rounded-card border border-line bg-surface-raised p-3">
            <SectionTitle>The default, in force now</SectionTitle>
            <Text className="text-sm text-ink-soft">{defaults.contentInstructions}</Text>
            <Button
              label="Start from this"
              tone="secondary"
              onPress={() => setInstructions(defaults.contentInstructions)}
            />
          </View>
        ) : (
          <Button label="Go back to the default" tone="quiet" onPress={() => setInstructions("")} />
        )}
      </View>

      <Text className="text-sm text-ink-faint">
        Saving a change clears the cards already written for this topic, so the next time you open a
        node it is written to these settings. The drills you have answered, and everything you have
        done on the map, stay as they are.
      </Text>

      {save.isError ? <ErrorState message={messageOf(save.error)} /> : null}

      <Button label={save.isPending ? "Saving…" : "Save"} onPress={submit} busy={save.isPending} />
    </ScrollView>
  );
}
