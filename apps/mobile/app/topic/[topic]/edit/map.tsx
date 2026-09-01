import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  useDeleteNode,
  useMoveNode,
  useRegenerateNode,
  useRegenerateTopic,
  useTopic,
  useTopicMapQuestions,
} from "@interestled/api";
import { buildTree, editHref } from "@interestled/domain";
import type { NodeTreeT } from "@interestled/domain";
import {
  Button,
  ErrorState,
  GroupCard,
  Input,
  LoadingContent,
  MapRow,
  SectionTitle,
  Sheet,
} from "@interestled/ui";
import { MapLevels, MoveDirection } from "@interestled/schemas";
import type { LearningNodeT, MapAnswerT, MapPlanViewT } from "@interestled/schemas";
import { messageOf } from "../../../../lib/errors";
import { backHeader } from "../../../../lib/nav";
import { ChipRow } from "../../../../components/ChipRow";
import { MapQuestions } from "../../../../components/MapQuestions";

/** Which rebuild sheet is open: the whole map, one group, or nothing. */
type Rebuilding = { kind: "map" } | { kind: "node"; node: LearningNodeT } | null;

/**
 * Editing the map. Three operations and no more: move a row among its siblings,
 * delete one, and ask for a part of it to be built again.
 *
 * Rebuilding one group is the operation that matters. "The map is nearly right"
 * is the normal case after reading it, and a product whose only answer to that
 * is regenerating everything throws away every node the learner has already
 * verified — so the group-level rebuild is what keeps a map worth correcting.
 */
export default function EditMapScreen(): ReactElement {
  const { topic: slug } = useLocalSearchParams<{ topic: string }>();
  const topicSlug = slug ?? "";
  const topic = useTopic(topicSlug);
  const move = useMoveNode(topicSlug);
  const remove = useDeleteNode(topicSlug);
  const rebuildMap = useRegenerateTopic(topicSlug);
  const rebuildNode = useRegenerateNode(topicSlug);
  const questions = useTopicMapQuestions(topicSlug);

  const [rebuilding, setRebuilding] = useState<Rebuilding>(null);
  const [instructions, setInstructions] = useState("");
  const [levels, setLevels] = useState<MapLevels>(MapLevels.Two);
  const [confirming, setConfirming] = useState<LearningNodeT | null>(null);
  // The seven choices, once they have been written for this rebuild. They are
  // asked again on every whole-map rebuild rather than reused: the map being
  // replaced is part of what they are asked about, so the answers given the
  // first time were answers about a different map.
  const [plan, setPlan] = useState<MapPlanViewT | null>(null);

  const header = (
    <Stack.Screen
      options={{
        title: "The map",
        headerLeft: backHeader(editHref(topicSlug)),
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

  const { nodes } = topic.data;
  const tree = buildTree(nodes);
  const busy = move.isPending || remove.isPending || rebuildNode.isPending;
  const rebuildBusy = rebuildMap.isPending || rebuildNode.isPending || questions.isPending;

  const openMapRebuild = (): void => {
    setInstructions("");
    setLevels(topic.data.topic.levels);
    setPlan(null);
    setRebuilding({ kind: "map" });
  };

  const openNodeRebuild = (node: LearningNodeT): void => {
    setInstructions("");
    setPlan(null);
    setRebuilding({ kind: "node", node });
  };

  const closeRebuild = (): void => {
    setRebuilding(null);
    setPlan(null);
  };

  /**
   * One group is rebuilt straight away; the whole map goes through the seven
   * choices first. The difference is what is at stake: a group rebuild leaves
   * every other node and its progress alone, and a whole-map rebuild replaces
   * all of it, so it is worth a minute to get the shape right.
   */
  const submitRebuild = (): void => {
    if (rebuilding === null) {
      return;
    }
    if (rebuilding.kind === "map") {
      questions.mutate({ instructions, levels }, { onSuccess: setPlan });
      return;
    }
    rebuildNode.mutate(
      { nodeId: rebuilding.node.id, instructions },
      { onSuccess: closeRebuild },
    );
  };

  const submitMapRebuild = (answers: MapAnswerT[]): void => {
    rebuildMap.mutate(
      { instructions, levels, planId: plan?.planId, answers },
      { onSuccess: closeRebuild },
    );
  };

  const renderEntry = (
    entry: NodeTreeT,
    siblings: readonly NodeTreeT[],
    depth: number,
  ): ReactElement => {
    const at = siblings.findIndex((candidate) => candidate.node.id === entry.node.id);
    // The same nesting the map itself draws, so the thing being edited looks like
    // the thing that was read.
    const body = (
      <View className="gap-2">
        <Text className="text-base font-medium text-ink">{entry.node.title}</Text>
        {/* The slug, because it is what the address bar will say. */}
        <Text className="text-xs text-ink-faint">/{entry.node.path}</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <RowAction
            label="↑"
            accessibilityLabel={`Move ${entry.node.title} up`}
            disabled={busy || at <= 0}
            onPress={() => move.mutate({ nodeId: entry.node.id, direction: MoveDirection.Up })}
          />
          <RowAction
            label="↓"
            accessibilityLabel={`Move ${entry.node.title} down`}
            disabled={busy || at === siblings.length - 1}
            onPress={() => move.mutate({ nodeId: entry.node.id, direction: MoveDirection.Down })}
          />
          {entry.children.length > 0 ? (
            <RowAction
              label="Rebuild"
              accessibilityLabel={`Rebuild what is under ${entry.node.title}`}
              disabled={busy}
              onPress={() => openNodeRebuild(entry.node)}
            />
          ) : null}
          <RowAction
            label="Delete"
            accessibilityLabel={`Delete ${entry.node.title}`}
            tone="danger"
            disabled={busy}
            onPress={() => setConfirming(entry.node)}
          />
        </View>
      </View>
    );

    if (entry.children.length === 0) {
      return (
        <MapRow key={entry.node.id}>
          <View className="p-3">{body}</View>
        </MapRow>
      );
    }
    return (
      <GroupCard key={entry.node.id} depth={depth} band={<View className="flex-1">{body}</View>}>
        {entry.children.map((child) => renderEntry(child, entry.children, depth + 1))}
      </GroupCard>
    );
  };

  return (
    <ScrollView contentContainerClassName="gap-5 p-4">
      {header}

      <View className="gap-2">
        <SectionTitle>The whole map</SectionTitle>
        <Text className="text-sm text-ink-soft">
          Rebuilding everything replaces every node, including the ones you have already done.
        </Text>
        <Button label="Rebuild the whole map" tone="secondary" onPress={openMapRebuild} />
      </View>

      <View className="gap-3">
        <SectionTitle>Move, rebuild or delete</SectionTitle>
        {tree.map((entry) => renderEntry(entry, tree, 0))}
      </View>

      {move.isError ? <ErrorState message={messageOf(move.error)} /> : null}
      {remove.isError ? <ErrorState message={messageOf(remove.error)} /> : null}

      <Sheet
        visible={rebuilding !== null}
        title={rebuildTitle(rebuilding, plan !== null)}
        body={
          rebuilding?.kind === "node"
            ? "Everything else on the map keeps the progress you have made on it."
            : "Every node is replaced, and the progress on them goes with it."
        }
        onClose={() => (rebuildBusy ? undefined : closeRebuild())}
      >
        {plan === null ? (
          <>
            <Input
              label="What should be different?"
              value={instructions}
              onChangeText={setInstructions}
              multiline
              maxLength={600}
              placeholder={"Less YAML, more on networking\nAssume I already know containers"}
              hint="Optional. Leave it empty to build it again from the same answers."
            />
            {rebuilding?.kind === "map" ? (
              <View className="gap-2">
                <Text className="text-sm font-medium text-ink-soft">How deep should it go?</Text>
                <ChipRow
                  options={[
                    { value: String(MapLevels.Two), label: "Two levels" },
                    { value: String(MapLevels.Three), label: "Three levels" },
                  ]}
                  selected={String(levels)}
                  onSelect={(value) =>
                    setLevels(value === String(MapLevels.Three) ? MapLevels.Three : MapLevels.Two)
                  }
                />
              </View>
            ) : null}

            {questions.isError ? <ErrorState message={messageOf(questions.error)} /> : null}
            {rebuildNode.isError ? <ErrorState message={messageOf(rebuildNode.error)} /> : null}

            <Button
              label={rebuildLabel(rebuilding, questions.isPending, rebuildNode.isPending)}
              onPress={submitRebuild}
              busy={questions.isPending || rebuildNode.isPending}
            />
          </>
        ) : (
          <>
            <MapQuestions
              questions={plan.questions}
              finishLabel={rebuildMap.isPending ? "Building…" : "Build it again"}
              busy={rebuildMap.isPending}
              onFinish={submitMapRebuild}
            />
            {rebuildMap.isError ? <ErrorState message={messageOf(rebuildMap.error)} /> : null}
          </>
        )}
      </Sheet>

      <Sheet
        visible={confirming !== null}
        title={confirming === null ? "" : `Delete “${confirming.title}”?`}
        body="This also deletes everything under it, and cannot be undone."
        onClose={() => setConfirming(null)}
      >
        <Button
          label="Delete it"
          onPress={() => {
            if (confirming !== null) {
              remove.mutate(confirming.id, { onSuccess: () => setConfirming(null) });
            }
          }}
          busy={remove.isPending}
        />
        <Button label="Keep it" tone="secondary" onPress={() => setConfirming(null)} />
      </Sheet>
    </ScrollView>
  );
}

/**
 * The whole-map rebuild takes two sheets: what should be different, then the
 * seven choices. Naming the stage in the title is what stops the second one
 * reading as an unexplained interruption of the first.
 */
function rebuildTitle(rebuilding: Rebuilding, choosing: boolean): string {
  if (rebuilding?.kind === "node") {
    return `Rebuild what is under \u201c${rebuilding.node.title}\u201d`;
  }
  return choosing ? "Which of these do you want?" : "Rebuild the whole map";
}

function rebuildLabel(rebuilding: Rebuilding, asking: boolean, building: boolean): string {
  if (rebuilding?.kind === "node") {
    return building ? "Building\u2026" : "Build it again";
  }
  return asking ? "Writing the choices\u2026" : "Next";
}

function RowAction({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  tone = "normal",
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "normal" | "danger";
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 min-w-11 items-center justify-center rounded-card border border-line-strong bg-surface px-3 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <Text className={`text-sm ${tone === "danger" ? "text-warn" : "text-ink-soft"}`}>{label}</Text>
    </Pressable>
  );
}
