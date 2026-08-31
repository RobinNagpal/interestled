import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useTopic } from "@interestled/api";
import {
  isBranch,
  nodeByPath,
  nodeHref,
  rollupMinutes,
  topicHref,
} from "@interestled/domain";
import {
  EmptyState,
  ErrorState,
  Minutes,
  NodeStatusDot,
  SectionTitle,
  Skeleton,
  statusLabel,
} from "@interestled/ui";
import type { LearningNodeT } from "@interestled/schemas";
import { messageOf } from "../../../lib/errors";
import { backHeader } from "../../../lib/nav";
import { NodeCard } from "../../../components/NodeCard";
import { NodeDrill } from "../../../components/NodeDrill";

/**
 * The segment that turns a node's URL into its drill. Reserved by the slug
 * allocator, so no node can ever be called this and shadow it.
 */
const DRILL_SEGMENT = "drill";

/**
 * Everything below a topic lives at its own address:
 *
 *   /topic/kubernetes/scheduling            a group
 *   /topic/kubernetes/scheduling/taints     the card
 *   /topic/kubernetes/scheduling/taints/drill
 *
 * One file resolves all three because they share the same lookup: the path is
 * the node's identity, and whether it is a group, a card or a drill is a fact
 * about the node the map already told us.
 */
export default function NodePathScreen(): ReactElement {
  const params = useLocalSearchParams<{ topic: string; path: string | string[] }>();
  const topicSlug = params.topic ?? "";
  const segments = (Array.isArray(params.path) ? params.path : [params.path ?? ""]).filter(
    (segment) => segment !== "",
  );
  const isDrill = segments[segments.length - 1] === DRILL_SEGMENT;
  const nodePath = (isDrill ? segments.slice(0, -1) : segments).join("/");

  // The map is fetched rather than the node: the same query already backs the
  // topic screen, so arriving from it costs nothing, and a cold link pays one
  // request to learn what the whole URL means.
  const topic = useTopic(topicSlug);

  const header = (title: string): ReactElement => (
    <Stack.Screen options={{ title, headerLeft: backHeader(topicHref(topicSlug)) }} />
  );

  if (topic.isPending) {
    return (
      <>
        {header("")}
        <Skeleton lines={6} />
      </>
    );
  }
  if (topic.isError) {
    return (
      <View className="p-4">
        {header("")}
        <ErrorState message={messageOf(topic.error)} />
      </View>
    );
  }

  const { nodes } = topic.data;
  const node = nodeByPath(nodes, nodePath);
  if (node === null) {
    return (
      <View className="p-4">
        {header("Not on this map")}
        <EmptyState
          title="Nothing lives at that address"
          body="The map may have been rebuilt since that link was made. Open it and pick up from there."
        />
      </View>
    );
  }

  const parentPath = node.path.includes("/")
    ? nodeHref(topicSlug, node.path.slice(0, node.path.lastIndexOf("/")))
    : topicHref(topicSlug);

  if (isBranch(node, nodes)) {
    return (
      <>
        <Stack.Screen options={{ title: node.title, headerLeft: backHeader(parentPath) }} />
        <GroupScreen topicSlug={topicSlug} node={node} nodes={nodes} />
      </>
    );
  }

  if (isDrill) {
    return (
      <>
        <Stack.Screen
          options={{ title: node.title, headerLeft: backHeader(nodeHref(topicSlug, node.path)) }}
        />
        <NodeDrill topic={topic.data.topic} node={node} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: node.title, headerLeft: backHeader(parentPath) }} />
      <NodeCard topicSlug={topicSlug} node={node} nodes={nodes} />
    </>
  );
}

/**
 * A group has no card — it is a heading. Opening one shows what is under it, so
 * a link to a group is still a place you can arrive at rather than an error.
 */
function GroupScreen({
  topicSlug,
  node,
  nodes,
}: {
  topicSlug: string;
  node: LearningNodeT;
  nodes: readonly LearningNodeT[];
}): ReactElement {
  const children = nodes
    .filter((candidate) => candidate.parentId === node.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <View className="gap-1">
        <Text className="text-lg text-ink">{node.claim}</Text>
        <Text className="text-sm text-ink-soft">You will be able to {node.capability}.</Text>
      </View>
      <SectionTitle>What is in here</SectionTitle>
      {children.map((child) => (
        <Pressable
          key={child.id}
          accessibilityRole="button"
          onPress={() => router.push(nodeHref(topicSlug, child.path))}
          className="flex-row items-center gap-3 rounded-card bg-surface p-3"
        >
          {isBranch(child, nodes) ? null : <NodeStatusDot status={child.status} />}
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-medium text-ink">{child.title}</Text>
            <Text className="text-sm text-ink-soft" numberOfLines={2}>
              {child.claim}
            </Text>
            <View className="flex-row items-center gap-2">
              <Minutes value={rollupMinutes(child, nodes)} />
              {isBranch(child, nodes) ? null : (
                <Text className="text-xs text-ink-faint">· {statusLabel(child.status)}</Text>
              )}
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
