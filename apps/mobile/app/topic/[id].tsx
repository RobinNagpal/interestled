import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useRetryTopic, useSetNodeStatus, useTopic } from "@learnloop/api";
import { Button, ErrorState, Minutes, NodeStatusDot, SectionTitle, Skeleton, statusLabel } from "@learnloop/ui";
import { NodeStatus, TopicStatus } from "@learnloop/schemas";
import type { LearningNodeT } from "@learnloop/schemas";
import { messageOf } from "../../lib/errors";

/**
 * The map. Everything rests on this being honest, so a node advances only on
 * production — and nothing on it ever locks, because a missing prerequisite is
 * a note you can walk past rather than a gate.
 */
export default function TopicScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topicId = id ?? "";
  const topic = useTopic(topicId);
  const setStatus = useSetNodeStatus(topicId);
  const retry = useRetryTopic();

  if (topic.isPending) {
    return <Skeleton lines={6} />;
  }
  if (topic.isError) {
    return (
      <View className="p-4">
        <ErrorState message={messageOf(topic.error)} />
      </View>
    );
  }

  const { nodes, progress, resume } = topic.data;

  // Generation is one model call and it does fail — a bad key, a quota, a
  // response the schema refused twice. It can also be cut off: CloudFront gives
  // up at 60s while the Lambda runs to 120s, and a request killed mid-flight
  // never reaches the catch that would mark it failed. Such a topic sits at
  // "generating" with no nodes, so both states need the same way out.
  const stalled =
    topic.data.topic.status === TopicStatus.Generating && nodes.length === 0;
  if (topic.data.topic.status === TopicStatus.Failed || stalled) {
    return (
      <View className="gap-4 p-4">
        <Text className="text-2xl font-bold text-ink">{topic.data.topic.title}</Text>
        <ErrorState
          message={
            topic.data.topic.error ??
            (stalled
              ? "Building the map was interrupted before it finished."
              : "The map could not be built.")
          }
          hint="Nothing was lost — retrying regenerates the map from the same answers."
        />
        <Button label="Try again" onPress={() => retry.mutate(topicId)} busy={retry.isPending} />
        {retry.isError ? <ErrorState message={messageOf(retry.error)} /> : null}
      </View>
    );
  }
  const shaky = nodes.filter((node) => node.status === NodeStatus.Shaky);
  const next = nodes.find((node) => node.status === NodeStatus.Untouched);

  return (
    <ScrollView contentContainerClassName="gap-5 p-4">
      <View className="gap-1">
        <Text className="text-2xl font-bold text-ink">{topic.data.topic.title}</Text>
        {/* Progress as ability, never as a percentage of an unseen total. */}
        <Text className="text-sm text-ink-soft">
          {progress.earned} of {progress.total} you can do · about {progress.remainingMinutes} min left
        </Text>
      </View>

      {/* The restore point: what you were doing, one tap back in. */}
      {resume !== null ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(
              resume.drillId === null
                ? `/node/${resume.nodeId}`
                : `/node/${resume.nodeId}/drill?topicId=${topicId}`,
            )
          }
          className="gap-1 rounded-card bg-accent-soft p-4"
        >
          <SectionTitle>Pick up where you were</SectionTitle>
          <Text className="text-base text-ink">
            {resume.lastThought === "" ? "You were part way through a node." : resume.lastThought}
          </Text>
          {resume.draft === "" ? null : (
            <Text className="text-sm text-ink-soft" numberOfLines={2}>
              Your unfinished answer: “{resume.draft}”
            </Text>
          )}
        </Pressable>
      ) : null}

      {shaky.length > 0 ? (
        <View className="gap-2">
          <SectionTitle>Worth another look</SectionTitle>
          {shaky.map((node) => (
            <NodeRow key={node.id} node={node} onKnown={() => undefined} />
          ))}
        </View>
      ) : null}

      <View className="gap-2">
        <SectionTitle>The map</SectionTitle>
        {nodes.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            onKnown={() => setStatus.mutate({ nodeId: node.id, status: NodeStatus.Verified })}
          />
        ))}
      </View>

      {progress.capabilities.length > 0 ? (
        <View className="gap-2">
          <SectionTitle>What you can do now</SectionTitle>
          {progress.capabilities.map((capability, index) => (
            <Text key={index} className="text-base text-ink">
              · {capability}
            </Text>
          ))}
        </View>
      ) : null}

      {next === undefined ? null : (
        <Button label={`Next: ${next.title} · ${next.minutes} min`} onPress={() => router.push(`/node/${next.id}`)} />
      )}
    </ScrollView>
  );
}

function NodeRow({ node, onKnown }: { node: LearningNodeT; onKnown: () => void }): ReactElement {
  return (
    <View className="flex-row items-center gap-3 rounded-card bg-surface p-3">
      <NodeStatusDot status={node.status} />
      <Pressable className="flex-1 gap-0.5" onPress={() => router.push(`/node/${node.id}`)}>
        <Text className="text-base font-medium text-ink">{node.title}</Text>
        <Text className="text-sm text-ink-soft" numberOfLines={2}>
          {node.claim}
        </Text>
        <View className="flex-row items-center gap-2">
          <Minutes value={node.minutes} />
          <Text className="text-xs text-ink-faint">· {statusLabel(node.status)}</Text>
        </View>
      </Pressable>
      {/* Honoured without proof. Review catches a wrong claim far more cheaply
          than making everybody prove themselves up front. */}
      {node.status === NodeStatus.Untouched ? (
        <Pressable accessibilityRole="button" onPress={onKnown} className="px-2 py-1">
          <Text className="text-xs text-ink-faint">I know this</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
