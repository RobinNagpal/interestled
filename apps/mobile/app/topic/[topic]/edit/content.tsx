import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTopic, useTopicDefaults, useUpdateTopicContentSettings } from "@interestled/api";
import { editHref } from "@interestled/domain";
import {
  Button,
  ErrorState,
  ENGLISH_COPY,
  ENGLISH_OPTIONS,
  FORMAT_COPY,
  FORMAT_OPTIONS,
  Input,
  LoadingContent,
  PARAGRAPH_NOTE,
  READ_TIME_OPTIONS,
  SectionTitle,
  TECHNICAL_COPY,
  PARAGRAPH_OPTIONS,
  TECHNICAL_OPTIONS,
} from "@interestled/ui";
import { ReadTimeSchema } from "@interestled/schemas";
import type { ParagraphLength } from "@interestled/schemas";
import type {
  ContentFormat,
  EnglishLevel,
  TechnicalDetail,
  TopicContentSettingsT,
  TopicT,
} from "@interestled/schemas";
import { useSeedContentInstructions } from "@interestled/api";
import { messageOf } from "../../../../lib/errors";
import { useSeededText } from "../../../../components/SeededInstructions";
import { backHeader, goBack } from "../../../../lib/nav";
import { ChipRow } from "../../../../components/ChipRow";

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
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>(topic.englishLevel);
  const [technicalDetail, setTechnicalDetail] = useState<TechnicalDetail>(topic.technicalDetail);
  const [format, setFormat] = useState<ContentFormat>(topic.format);
  const [paragraphLength, setParagraphLength] = useState<ParagraphLength>(topic.paragraphLength);
  const [averageReadTime, setAverageReadTime] = useState(topic.averageReadTime);
  const [instructions, setInstructions] = useState(topic.contentInstructions);

  const usingDefault = instructions.trim() === "";
  // The lines this topic's own paragraph length produces, not the ones the
  // default length would: a panel headed "in force now" has to be in force now.
  const seed = useSeedContentInstructions();
  const inForce =
    useSeededText(paragraphLength, (length, onSeeded) =>
      seed.mutate(length, { onSuccess: onSeeded }),
    ) || defaults.contentInstructions;

  const submit = (): void => {
    save.mutate(
      {
        englishLevel,
        technicalDetail,
        format,
        paragraphLength,
        averageReadTime,
        contentInstructions: instructions,
      },
      // Back to the hub, not another copy of it pushed on top.
      { onSuccess: () => goBack(editHref(topicSlug)) },
    );
  };

  return (
    <ScrollView contentContainerClassName="gap-5 p-4">
      {/* Two questions where there was one, because the old single chip could
          not say "everyday words, all the terminology". */}
      <View className="gap-2">
        <SectionTitle>English</SectionTitle>
        <ChipRow
          options={ENGLISH_OPTIONS}
          selected={englishLevel}
          onSelect={(value) => setEnglishLevel(value)}
        />
        <Text className="text-sm text-ink-soft">{ENGLISH_COPY[englishLevel].body}</Text>
      </View>

      <View className="gap-2">
        <SectionTitle>Technical detail</SectionTitle>
        <ChipRow
          options={TECHNICAL_OPTIONS}
          selected={technicalDetail}
          onSelect={(value) => setTechnicalDetail(value)}
        />
        <Text className="text-sm text-ink-soft">{TECHNICAL_COPY[technicalDetail].body}</Text>
      </View>

      <View className="gap-2">
        <SectionTitle>Shape</SectionTitle>
        <ChipRow options={FORMAT_OPTIONS} selected={format} onSelect={(value) => setFormat(value)} />
        <Text className="text-sm text-ink-soft">{FORMAT_COPY[format].body}</Text>
      </View>

      <View className="gap-2">
        <SectionTitle>How long a paragraph runs</SectionTitle>
        <ChipRow
          options={PARAGRAPH_OPTIONS}
          selected={paragraphLength}
          onSelect={(value) => setParagraphLength(value)}
        />
        <Text className="text-sm text-ink-soft">{PARAGRAPH_NOTE}</Text>
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
            <Text className="text-sm text-ink-soft">{inForce}</Text>
            <Button
              label="Start from this"
              tone="secondary"
              onPress={() => setInstructions(inForce)}
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
