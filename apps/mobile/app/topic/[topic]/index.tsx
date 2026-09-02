import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ReactElement } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useRegenerateTopic, useSetNodeStatus, useTopic } from "@interestled/api";
import {
  buildTree,
  drillHref,
  editHref,
  nextNode,
  nodeHref,
  rollupMinutes,
} from "@interestled/domain";
import type { NodeTreeT } from "@interestled/domain";
import {
  Button,
  ErrorState,
  GroupCard,
  HeaderButton,
  InlineMarkdown,
  LoadingContent,
  MapRow,
  Minutes,
  NodeStatusDot,
  Screen,
  SectionTitle,
  statusLabel,
} from "@interestled/ui";
import { NodeStatus, TopicStatus, mapShapeOf } from "@interestled/schemas";
import type { LearningNodeT } from "@interestled/schemas";
import { messageOf } from "../../../lib/errors";
import { backHeader } from "../../../lib/nav";

/**
 * The map. Everything rests on this being honest, so a node advances only on
 * production — and nothing on it ever locks, because a missing prerequisite is
 * a note you can walk past rather than a gate.
 *
 * Groups are headings and nothing else: no concept card, no drill and no status,
 * and collapsing one is how a three-level map stays a thing you can see the whole
 * of, which is the entire point of having a map (ideal 1). They are drawn as
 * cards holding their children rather than as an indented list, because an indent
 * stops carrying the structure as soon as a title wraps.
 */
export default function TopicScreen(): ReactElement {
  const { topic: slug } = useLocalSearchParams<{ topic: string }>();
  const topicSlug = slug ?? "";
  const topic = useTopic(topicSlug);
  const setStatus = useSetNodeStatus(topicSlug);
  const regenerate = useRegenerateTopic(topicSlug);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const header = (
    <Stack.Screen
      options={{
        title: topic.data?.topic.title ?? "Map",
        headerLeft: backHeader("/"),
        headerRight: () =>
          topic.data === undefined ? null : (
            <HeaderButton
              label="Edit"
              accessibilityLabel="Edit the map"
              onPress={() => router.push(editHref(topicSlug))}
            />
          ),
      }}
    />
  );

  if (topic.isPending) {
    return (
      <>
        {header}
        <LoadingContent label="Opening the map…" lines={6} />
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

  const { nodes, progress, resume } = topic.data;

  // Generation is one model call and it does fail — a bad key, a quota, a
  // response the schema refused twice. It can also be cut off: CloudFront gives
  // up at 60s while the process runs on, and a request killed mid-flight never
  // reaches the catch that would mark it failed. Such a topic sits at
  // "generating" with no nodes, so both states need the same way out.
  const stalled = topic.data.topic.status === TopicStatus.Generating && nodes.length === 0;
  if (topic.data.topic.status === TopicStatus.Failed || stalled) {
    return (
      <View className="gap-4 p-4">
        {header}
        <Text className="text-2xl font-bold text-ink">{topic.data.topic.title}</Text>
        <ErrorState
          message={
            topic.data.topic.error ??
            (stalled
              ? "Building the map was interrupted before it finished."
              : "The map could not be built.")
          }
          hint="Nothing was lost — rebuilding uses the same answers you already gave."
        />
        <Button
          label="Try again"
          // No plan and no answers: the server falls back to the choices the
          // build that failed was made from, which is what the hint above
          // promises. Asking the seven questions again here would be asking
          // someone to redo work that was never lost.
          onPress={() => regenerate.mutate({ ...mapShapeOf(topic.data.topic), mapInstructions: topic.data.topic.mapInstructions, answers: [] })}
          busy={regenerate.isPending}
        />
        {regenerate.isError ? <ErrorState message={messageOf(regenerate.error)} /> : null}
      </View>
    );
  }

  const shaky = nodes.filter((node) => node.status === NodeStatus.Shaky);
  const tree = buildTree(nodes);
  const next = nextNode(nodes);

  const toggle = (id: string): void =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  const renderEntry = (entry: NodeTreeT, depth: number): ReactElement => {
    if (entry.children.length === 0) {
      return (
        <NodeRow
          key={entry.node.id}
          node={entry.node}
          topicSlug={topicSlug}
          onKnown={() =>
            setStatus.mutate({ nodeId: entry.node.id, status: NodeStatus.Verified })
          }
        />
      );
    }
    const open = !collapsed.has(entry.node.id);
    return (
      <GroupCard
        key={entry.node.id}
        depth={depth}
        toggle={{ expanded: open, label: entry.node.title, onPress: () => toggle(entry.node.id) }}
        band={
          <>
            <Text className="text-base font-semibold text-ink">{entry.node.title}</Text>
            <InlineMarkdown text={entry.node.claim} className="text-sm text-ink-soft" />
            {/* Rolled up, so a collapsed group is still honest about what it costs. */}
            <Minutes value={rollupMinutes(entry.node, nodes)} />
          </>
        }
      >
        {open ? entry.children.map((child) => renderEntry(child, depth + 1)) : undefined}
      </GroupCard>
    );
  };

  return (
    <Screen contentContainerClassName="gap-5 p-4">
      {header}
      <View className="gap-1">
        {/* Progress as ability, never as a percentage of an unseen total. */}
        <Text className="text-sm text-ink-soft">
          {progress.earned} of {progress.total} you can do · about {progress.remainingMinutes} min left
        </Text>
      </View>

      {/* The restore point: what you were doing, one tap back in. */}
      {resume !== null ? (
        <ResumeCard
          topicSlug={topicSlug}
          nodes={nodes}
          resume={resume}
        />
      ) : null}

      {shaky.length > 0 ? (
        <View className="gap-2">
          <SectionTitle>Worth another look</SectionTitle>
          {shaky.map((node) => (
            <NodeRow key={node.id} node={node} topicSlug={topicSlug} onKnown={() => undefined} />
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        <SectionTitle>The map</SectionTitle>
        {tree.map((entry) => renderEntry(entry, 0))}
      </View>

      {progress.capabilities.length > 0 ? (
        <View className="gap-2">
          <SectionTitle>What you can do now</SectionTitle>
          {progress.capabilities.map((capability, index) => (
            <InlineMarkdown key={index} text={`· ${capability}`} className="text-base text-ink" />
          ))}
        </View>
      ) : null}

      {/* One primary action, and it names what it costs. */}
      {next === null ? null : (
        <Button
          label={`Next: ${next.title} · ${next.minutes} min`}
          onPress={() => router.push(nodeHref(topicSlug, next.path))}
        />
      )}
    </Screen>
  );
}

function ResumeCard({
  topicSlug,
  nodes,
  resume,
}: {
  topicSlug: string;
  nodes: readonly LearningNodeT[];
  resume: { nodeId: string; drillId: string | null; draft: string; lastThought: string };
}): ReactElement | null {
  const node = nodes.find((candidate) => candidate.id === resume.nodeId);
  // The node it points at can have been deleted or regenerated away since; a
  // restore point with nowhere to go is simply not offered.
  if (node === undefined) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push(
          resume.drillId === null ? nodeHref(topicSlug, node.path) : drillHref(topicSlug, node.path),
        )
      }
      className="gap-1 rounded-card border border-accent/20 bg-accent-soft p-4"
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
  );
}

function NodeRow({
  node,
  topicSlug,
  onKnown,
}: {
  node: LearningNodeT;
  topicSlug: string;
  onKnown: () => void;
}): ReactElement {
  return (
    <MapRow tone={node.status === NodeStatus.Shaky ? "warn" : "plain"}>
      <View className="flex-row items-center gap-3 p-3">
        <NodeStatusDot status={node.status} />
        <Pressable
          className="flex-1 gap-0.5"
          onPress={() => router.push(nodeHref(topicSlug, node.path))}
        >
          <Text className="text-base font-medium text-ink">{node.title}</Text>
          <InlineMarkdown text={node.claim} className="text-sm text-ink-soft" numberOfLines={2} />
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
    </MapRow>
  );
}
