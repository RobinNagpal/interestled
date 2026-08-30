import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useCard } from "@interestled/api";
import { Button, ErrorState, JargonList, SectionTitle, Skeleton } from "@interestled/ui";
import { DepthAction } from "@interestled/schemas";
import type { CardDepthT } from "@interestled/schemas";
import { messageOf } from "../../../lib/errors";

const DEPTH_BUTTONS: { action: DepthAction; label: string }[] = [
  { action: DepthAction.Simpler, label: "Simpler" },
  { action: DepthAction.Deeper, label: "Deeper" },
  { action: DepthAction.MoreConcrete, label: "More concrete" },
  { action: DepthAction.WhyItMatters, label: "Why it matters" },
  { action: DepthAction.WhereThisBreaks, label: "Where this breaks" },
];

/**
 * One concept, one screen, always the same six slots. Opening it marks the node
 * Seen and nothing further — reading can never complete a node, or the map stops
 * being honest and everything resting on it collapses.
 */
export default function NodeCardScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nodeId = id ?? "";
  const [depth, setDepth] = useState<CardDepthT | undefined>(undefined);
  const [action, setAction] = useState<DepthAction | undefined>(undefined);
  const card = useCard(nodeId, { depth, action });

  if (card.isPending) {
    return <Skeleton lines={6} />;
  }
  if (card.isError) {
    return (
      <View className="p-4">
        <ErrorState message={messageOf(card.error)} />
      </View>
    );
  }

  const { content, node, missingPrerequisites } = card.data;

  return (
    <ScrollView contentContainerClassName="gap-5 p-4">
      <View className="gap-1">
        <Text className="text-xs uppercase tracking-wide text-ink-faint">{node.title}</Text>
        {/* The claim first: the answer arrives before any context. */}
        <Text className="text-xl font-semibold text-ink">{content.claim}</Text>
      </View>

      {/* Advisory, not a gate. A live question is the strongest motivation the
          learner will ever have, and a lock spends it. */}
      {missingPrerequisites.length > 0 ? (
        <View className="gap-1 rounded-card bg-surface-sunken p-3">
          <Text className="text-sm text-ink-soft">
            Usually easier after {missingPrerequisites.map((prereq) => prereq.title).join(", ")} — but
            carry on if you want.
          </Text>
        </View>
      ) : null}

      <View className="gap-3 rounded-card bg-surface p-4">
        <SectionTitle>Why it behaves this way</SectionTitle>
        {content.mechanism.map((line, index) => (
          <Text key={index} className="text-base leading-6 text-ink">
            {line}
          </Text>
        ))}
      </View>

      <View className="gap-2 rounded-card bg-surface p-4">
        <SectionTitle>Concretely</SectionTitle>
        <Text className="text-base leading-6 text-ink">{content.example.setup}</Text>
        <Text className="text-base leading-6 text-ink-soft">→ {content.example.result}</Text>
      </View>

      <View className="gap-2 rounded-card bg-surface p-4">
        <SectionTitle>What people get wrong</SectionTitle>
        <Text className="text-base leading-6 text-ink-soft">{content.misconception.belief}</Text>
        <Text className="text-base leading-6 text-ink">{content.misconception.correction}</Text>
      </View>

      <JargonList terms={content.jargon} />

      <View className="gap-2">
        <SectionTitle>Change the depth</SectionTitle>
        <View className="flex-row flex-wrap gap-2">
          {DEPTH_BUTTONS.map((button) => (
            <Pressable
              key={button.action}
              accessibilityRole="button"
              onPress={() => {
                setDepth(card.data.depth);
                setAction(button.action);
              }}
              className="rounded-full border border-ink-faint/40 bg-surface px-3 py-2"
            >
              <Text className="text-sm text-ink-soft">{button.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button
        label="Now prove it"
        onPress={() => router.push(`/node/${nodeId}/drill?topicId=${node.topicId}`)}
      />
    </ScrollView>
  );
}
