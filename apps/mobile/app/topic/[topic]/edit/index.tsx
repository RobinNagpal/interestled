import { useState } from "react";
import { Text, View } from "react-native";
import type { ReactElement } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useArchiveTopic, useTopic } from "@interestled/api";
import { editContentHref, editGoalsHref, editMapHref, topicHref } from "@interestled/domain";
import {
  Button,
  ErrorState,
  Input,
  LoadingContent,
  Screen,
  SectionTitle,
  Sheet,
} from "@interestled/ui";
import { messageOf } from "../../../../lib/errors";
import { backHeader, useHardwareBack } from "../../../../lib/nav";

/**
 * What has to be typed to archive a topic, and the one place it is written.
 *
 * A word rather than a second button: archiving is the only action in the
 * product that takes a whole topic away at once, and a confirm button next to
 * the button that opened it is one mis-tap. Read without regard to case, because
 * a phone keyboard capitalises for you and being told "no" by your own keyboard
 * is not friction, it is a dead end.
 */
const CONFIRM_WORD = "DELETE";

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
  const archive = useArchiveTopic(topicSlug);
  // Android's own back button, saying what the bar says. A sheet open over this
  // screen answers the press itself and closes, which never reaches here.
  useHardwareBack(topicHref(topicSlug));

  const [archiving, setArchiving] = useState(false);
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  const closeArchive = (): void => {
    setArchiving(false);
    setTyped("");
  };

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

      {/* Last, and on its own, because it is the one thing on this screen that
          is not an edit: everything above changes what the topic is, and this
          takes it off the list. */}
      <Choice
        title="Archive this topic"
        body="It leaves your topics, and its review items stop coming up. Nothing is deleted, but there is no way back to it from inside the app."
        label="Archive this topic"
        onPress={() => {
          setTyped("");
          setArchiving(true);
        }}
      />

      <Sheet
        visible={archiving}
        title={topic.data === undefined ? "Archive this topic" : `Archive “${topic.data.topic.title}”?`}
        body="It goes from your topics list, its map and cards stop opening, and the recall items from it stop coming up in review. You cannot bring it back from inside the app."
        onClose={() => (archive.isPending ? undefined : closeArchive())}
      >
        <Input
          label={`Type ${CONFIRM_WORD} to confirm`}
          value={typed}
          onChangeText={setTyped}
          placeholder={CONFIRM_WORD}
          autoFocus
          maxLength={20}
        />
        {archive.isError ? <ErrorState message={messageOf(archive.error)} /> : null}
        <Button
          label="Archive it"
          disabled={!confirmed}
          busy={archive.isPending}
          onPress={() =>
            archive.mutate(undefined, {
              // Straight to the list rather than back one screen: everything
              // under this one in the stack is a screen about a topic that has
              // stopped answering, and `replace` is what stops back landing on
              // one of them.
              onSuccess: () => {
                closeArchive();
                router.replace("/");
              },
            })
          }
        />
        <Button label="Keep it" tone="secondary" onPress={closeArchive} />
      </Sheet>
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
