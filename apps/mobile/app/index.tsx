import { Pressable, ScrollView, Text } from "react-native";
import type { ReactElement } from "react";
import { Link, router } from "expo-router";
import { useReview, useTopics } from "@interestled/api";
import { topicHref } from "@interestled/domain";
import { Button, EmptyState, ErrorState, Skeleton } from "@interestled/ui";
import { TopicStatus } from "@interestled/schemas";
import { useAuth } from "../lib/auth";
import { messageOf } from "../lib/errors";

export default function TopicsScreen(): ReactElement {
  const topics = useTopics();
  const review = useReview();
  const { signOut } = useAuth();

  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      {/* Review comes first when something is due, and it is three items, not a
          backlog — so an absence never turns into a wall. */}
      {review.data !== undefined && review.data.atoms.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/review")}
          className="flex-row items-center justify-between rounded-card bg-accent-soft p-4"
        >
          <Text className="text-base text-ink">
            {review.data.atoms.length} to recall before you start
          </Text>
          <Text className="text-sm font-semibold text-accent">2 min →</Text>
        </Pressable>
      ) : null}

      {topics.isPending ? <Skeleton lines={4} /> : null}
      {topics.isError ? <ErrorState message={messageOf(topics.error)} /> : null}

      {topics.data?.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Add something you want to learn. You get a map of it in about a minute."
        />
      ) : null}

      {topics.data?.map((topic) => (
        <Link key={topic.id} href={topicHref(topic.slug)} asChild>
          <Pressable className="gap-1 rounded-card bg-surface p-4">
            <Text className="text-lg font-semibold text-ink">{topic.title}</Text>
            {topic.goal === "" ? null : (
              <Text className="text-sm text-ink-soft">{topic.goal}</Text>
            )}
            {topic.status === TopicStatus.Failed ? (
              <Text className="text-sm text-warn">Map could not be built — open to retry</Text>
            ) : null}
            {topic.status === TopicStatus.Generating ? (
              <Text className="text-sm text-ink-faint">Building the map…</Text>
            ) : null}
          </Pressable>
        </Link>
      ))}

      <Button label="Add a topic" onPress={() => router.push("/topic/new")} />
      <Button
        label="Your profile"
        tone="secondary"
        onPress={() => router.push("/profile")}
      />
      <Button label="Sign out" tone="quiet" onPress={() => void signOut()} />
    </ScrollView>
  );
}
