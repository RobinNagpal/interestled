import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTopic, useUpdateTopicInfo } from "@interestled/api";
import { editHref } from "@interestled/domain";
import { Button, ErrorState, Input, LoadingContent } from "@interestled/ui";
import { TimeBudget } from "@interestled/schemas";
import type { TopicT } from "@interestled/schemas";
import { messageOf } from "../../../../lib/errors";
import { backHeader, goBack } from "../../../../lib/nav";
import { ChipRow } from "../../../../components/ChipRow";

const BUDGETS: { value: TimeBudget; label: string }[] = [
  { value: TimeBudget.Quick, label: "20 minutes" },
  { value: TimeBudget.Week, label: "A week" },
  { value: TimeBudget.Ongoing, label: "Ongoing" },
];

/**
 * The create screen's answers, after the fact. They were asked once and then
 * fixed for the life of the topic, which is backwards: reading a map is what
 * tells you the goal you gave was not quite the one you meant, and every
 * generation from that point on was still reading the old one.
 *
 * Saving regenerates nothing. The map on screen keeps every node and every
 * status; these answers are what the *next* generation reads — a rebuild is an
 * edit the learner chooses on the map screen, never a side effect of tidying a
 * sentence here.
 */
export default function EditGoalsScreen(): ReactElement {
  const { topic: slug } = useLocalSearchParams<{ topic: string }>();
  const topicSlug = slug ?? "";
  const topic = useTopic(topicSlug);

  const header = (
    <Stack.Screen
      options={{ title: "Goal and starting point", headerLeft: backHeader(editHref(topicSlug)) }}
    />
  );

  if (topic.isPending) {
    return (
      <>
        {header}
        <LoadingContent label="Opening the topic…" lines={5} />
      </>
    );
  }
  if (topic.isError) {
    return (
      <View className="p-4">
        {header}
        <ErrorState message={messageOf(topic.error)} />
      </View>
    );
  }

  return (
    <>
      {header}
      {/* Keyed by id, so the form is built once the answers are actually here
          rather than starting empty and filling in under the learner's hands. */}
      <GoalsForm key={topic.data.topic.id} topicSlug={topicSlug} topic={topic.data.topic} />
    </>
  );
}

function GoalsForm({ topicSlug, topic }: { topicSlug: string; topic: TopicT }): ReactElement {
  const save = useUpdateTopicInfo(topicSlug);
  const [title, setTitle] = useState(topic.title);
  const [summary, setSummary] = useState(topic.summary);
  const [goal, setGoal] = useState(topic.goal);
  const [level, setLevel] = useState(topic.level);
  const [timeBudget, setTimeBudget] = useState<TimeBudget>(topic.timeBudget);

  const submit = (): void => {
    save.mutate(
      { title, summary, goal, level, timeBudget },
      // Back to the hub, not another copy of it pushed on top.
      { onSuccess: () => goBack(editHref(topicSlug)) },
    );
  };

  return (
    <ScrollView contentContainerClassName="gap-5 p-4">
      <Input label="What you are learning" value={title} onChangeText={setTitle} maxLength={120} />
      <Input
        label="One line about it"
        value={summary}
        onChangeText={setSummary}
        maxLength={160}
        placeholder="Run and debug a small cluster"
        hint="This is what shows under the topic on your list."
      />
      <Input
        label="What do you want to be able to do with it? Three points."
        value={goal}
        onChangeText={setGoal}
        multiline
        maxLength={600}
        placeholder={"Deploy a service\nRead the logs when it breaks\nSize it without guessing"}
        hint="This picks the shortest path through the map."
      />
      <Input
        label="Where are you now, and where do you want to get to? 3-5 points."
        value={level}
        onChangeText={setLevel}
        multiline
        maxLength={600}
        placeholder={"I use Docker daily\nNever run anything in production\nWant to own a small cluster"}
        hint="This is the answer that saves you the most time."
      />
      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-soft">How much time have you got?</Text>
        <ChipRow options={BUDGETS} selected={timeBudget} onSelect={(value) => setTimeBudget(value)} />
      </View>

      <Text className="text-sm text-ink-faint">
        The map you already have stays exactly as it is, with everything you have done on it. These
        answers are read the next time something is built.
      </Text>

      {save.isError ? <ErrorState message={messageOf(save.error)} /> : null}

      <Button
        label={save.isPending ? "Saving…" : "Save"}
        onPress={submit}
        busy={save.isPending}
        disabled={title.trim().length < 2}
      />
    </ScrollView>
  );
}
