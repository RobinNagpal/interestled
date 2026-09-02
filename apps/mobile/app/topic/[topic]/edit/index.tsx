import { Text, View } from "react-native";
import type { ReactElement } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useTopic } from "@interestled/api";
import { editContentHref, editGoalsHref, editMapHref, topicHref } from "@interestled/domain";
import { Button, ErrorState, LoadingContent, Screen, SectionTitle } from "@interestled/ui";
import { messageOf } from "../../../../lib/errors";
import { backHeader } from "../../../../lib/nav";

/**
 * Three things can be edited about a topic, and they are three different
 * questions: what the map contains, what the topic is for, and how it is
 * written. They were one screen with only the first on it, which left the
 * answers given on the create screen — the ones every generation reads — fixed
 * for the life of the topic.
 *
 * Each is its own address (…/edit/map, …/edit/goals, …/edit/content) so a link
 * lands on the one being talked about, and so leaving one of them does not throw
 * away where you were in another.
 */
export default function EditTopicScreen(): ReactElement {
  const { topic: slug } = useLocalSearchParams<{ topic: string }>();
  const topicSlug = slug ?? "";
  const topic = useTopic(topicSlug);

  const header = (
    <Stack.Screen
      options={{
        title: topic.data === undefined ? "Edit" : `Edit: ${topic.data.topic.title}`,
        headerLeft: backHeader(topicHref(topicSlug)),
      }}
    />
  );

  if (topic.isPending) {
    return (
      <>
        {header}
        <LoadingContent label="Opening the topic…" lines={4} />
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
    <Screen contentContainerClassName="gap-5 p-4">
      {header}

      <Choice
        title="The map"
        body="Move a node among its neighbours, rebuild one group in your own words, or delete something. Nothing else on the map is touched."
        label="Edit the map"
        onPress={() => router.push(editMapHref(topicSlug))}
      />
      <Choice
        title="Goal and starting point"
        body="The one line under this topic on your list, what you want to be able to do, and where you are starting from. Read by everything generated from here on."
        label="Edit the goal"
        onPress={() => router.push(editGoalsHref(topicSlug))}
      />
      <Choice
        title="How it is written"
        body="How hard the English is, how much terminology it uses, how long a node should take, and standing instructions carried by every card, drill and review item in this topic."
        label="Edit how it is written"
        onPress={() => router.push(editContentHref(topicSlug))}
      />
    </Screen>
  );
}

/** One destination: what it changes, said before the button that goes there. */
function Choice({
  title,
  body,
  label,
  onPress,
}: {
  title: string;
  body: string;
  label: string;
  onPress: () => void;
}): ReactElement {
  return (
    <View className="gap-2 rounded-card border border-line bg-surface p-4">
      <SectionTitle>{title}</SectionTitle>
      <Text className="text-base text-ink-soft">{body}</Text>
      <Button label={label} tone="secondary" onPress={onPress} />
    </View>
  );
}
