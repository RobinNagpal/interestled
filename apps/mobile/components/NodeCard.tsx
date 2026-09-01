import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { ReactElement, ReactNode } from "react";
import { router } from "expo-router";
import { useCard } from "@interestled/api";
import { depthAfter, drillHref, nodeHref, readTimeAfter } from "@interestled/domain";
import {
  ANGLE_OPTIONS,
  Button,
  Card,
  DEPTH_COPY,
  ErrorState,
  InlineMarkdown,
  JargonList,
  LoadingContent,
  Markdown,
  STYLE_COPY,
  STYLE_OPTIONS,
  SectionTitle,
} from "@interestled/ui";
import { CARD_MINUTES_MAX, Step } from "@interestled/schemas";
import type { CardSettingsT, LearningNodeT } from "@interestled/schemas";
import { ChipRow } from "./ChipRow";
import { messageOf } from "../lib/errors";

/**
 * One concept, one screen, always the same six slots. Opening it marks the node
 * Seen and nothing further — reading can never complete a node, or the map stops
 * being honest and everything resting on it collapses.
 */
export function NodeCard({
  topicSlug,
  node,
  nodes,
}: {
  topicSlug: string;
  node: LearningNodeT;
  nodes: readonly LearningNodeT[];
}): ReactElement {
  // What the learner has changed for this node, and nothing else: an empty
  // object is the card as the topic is written, which is what a fresh arrival
  // must get.
  const [overrides, setOverrides] = useState<Partial<CardSettingsT>>({});
  const card = useCard(node.id, overrides);

  if (card.isPending) {
    return (
      <LoadingContent
        label={`Writing the card for ${node.title}…`}
        hint="The first time a node is opened its card is written for you, which takes 10–30 seconds. After that it is instant."
        lines={6}
      />
    );
  }
  if (card.isError) {
    return (
      <View className="p-4">
        <ErrorState message={messageOf(card.error)} />
      </View>
    );
  }

  const { content, missingPrerequisites, settings } = card.data;
  // What the controls stand at: what the card in front of them was written to,
  // with anything just asked for on top. Stepping from the response alone would
  // make a second press during a rewrite land on the value already requested —
  // the same key, no request, and a button that looks dead again.
  const asked: CardSettingsT = { ...settings, ...overrides };
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]));

  return (
    <ScrollView contentContainerClassName="gap-5 p-4">
      <View className="gap-1">
        {/* The claim first: the answer arrives before any context. */}
        <InlineMarkdown text={content.claim} className="text-xl font-semibold text-ink" />
      </View>

      {/* Advisory, not a gate. A live question is the strongest motivation the
          learner will ever have, and a lock spends it. */}
      {missingPrerequisites.length > 0 ? (
        <View className="gap-1 rounded-card bg-surface-sunken p-3">
          <Text className="text-sm text-ink-soft">Usually easier after — but carry on if you want.</Text>
          <View className="flex-row flex-wrap gap-2">
            {missingPrerequisites.map((prereq) => {
              const target = byId.get(prereq.id);
              return (
                <Pressable
                  key={prereq.id}
                  accessibilityRole="link"
                  disabled={target === undefined}
                  onPress={() =>
                    target === undefined ? undefined : router.push(nodeHref(topicSlug, target.path))
                  }
                >
                  <Text className="text-sm text-accent underline">{prereq.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Paragraph spacing, not list spacing: the items are one argument in
          order, each starting from what the one above it established, and the
          airier gap the other sections use reads them as separate notes. */}
      <Card className="gap-2">
        <SectionTitle>Why it behaves this way</SectionTitle>
        {content.mechanism.map((line, index) => (
          <Markdown key={index} text={line} />
        ))}
      </Card>

      <Card className="gap-2">
        <SectionTitle>Concretely</SectionTitle>
        <Markdown text={content.example.setup} />
        <Markdown
          text={`→ ${content.example.result}`}
          className="text-base leading-6 text-ink-soft"
        />
      </Card>

      <Card className="gap-2">
        <SectionTitle>What people get wrong</SectionTitle>
        <Markdown
          text={content.misconception.belief}
          className="text-base leading-6 text-ink-soft"
        />
        <Markdown text={content.misconception.correction} />
      </Card>

      <JargonList terms={content.jargon} />

      <CardControls
        settings={asked}
        rewriting={card.isPlaceholderData || card.isFetching}
        changed={Object.keys(overrides).length > 0}
        onChange={(change) => setOverrides((current) => ({ ...current, ...change }))}
        onReset={() => setOverrides({})}
      />

      <Button label="Now prove it" onPress={() => router.push(drillHref(topicSlug, node.path))} />
    </ScrollView>
  );
}


/**
 * A step along one scale, with the end of it visible. The old control offered
 * five buttons that all looked live and two of which did nothing at depth 1 or
 * 5 — a press that refetches an identical card is indistinguishable from a
 * broken button, and the reader concludes the whole panel is broken.
 */
function StepButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${
        disabled ? "border-line bg-surface-sunken" : "border-ink-faint/40 bg-surface"
      }`}
    >
      <Text className={`text-sm ${disabled ? "text-ink-faint" : "text-ink-soft"}`}>{label}</Text>
    </Pressable>
  );
}

function ControlRow({
  title,
  value,
  children,
}: {
  title: string;
  value?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline gap-2">
        <SectionTitle>{title}</SectionTitle>
        {value === undefined ? null : <Text className="text-xs text-ink-soft">{value}</Text>}
      </View>
      {children}
    </View>
  );
}

/**
 * The four things that decide how this card came out, each of them a setting the
 * generator actually reads: how deep, how long, in whose words, and from which
 * angle. They are the topic's settings until the learner changes one here, and
 * the panel states what the card in front of them was written to — a control
 * that cannot say what it changed is one that looks like it changed nothing.
 */
function CardControls({
  settings,
  rewriting,
  changed,
  onChange,
  onReset,
}: {
  settings: CardSettingsT;
  /** The card on screen is the previous one; the next is being written. */
  rewriting: boolean;
  changed: boolean;
  onChange: (change: Partial<CardSettingsT>) => void;
  onReset: () => void;
}): ReactElement {
  const simpler = depthAfter(settings.depth, Step.Down);
  const deeper = depthAfter(settings.depth, Step.Up);
  const shorter = readTimeAfter(settings.minutes, Step.Down, CARD_MINUTES_MAX);
  const longer = readTimeAfter(settings.minutes, Step.Up, CARD_MINUTES_MAX);

  return (
    <Card className="gap-4">
      <View className="flex-row items-center justify-between">
        <SectionTitle>How this card is written</SectionTitle>
        {rewriting ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color="#2563eb" />
            <Text className="text-xs text-ink-soft">Rewriting…</Text>
          </View>
        ) : null}
      </View>

      <ControlRow
        title="Depth"
        value={`${settings.depth} of 5 · ${DEPTH_COPY[settings.depth] ?? ""}`}
      >
        <View className="flex-row flex-wrap gap-2">
          <StepButton
            label="Simpler"
            disabled={simpler === settings.depth}
            onPress={() => onChange({ depth: simpler })}
          />
          <StepButton
            label="Deeper"
            disabled={deeper === settings.depth}
            onPress={() => onChange({ depth: deeper })}
          />
        </View>
      </ControlRow>

      <ControlRow title="Length" value={`about ${settings.minutes} min`}>
        <View className="flex-row flex-wrap gap-2">
          <StepButton
            label="Shorter"
            disabled={shorter === settings.minutes}
            onPress={() => onChange({ minutes: shorter })}
          />
          <StepButton
            label="Longer"
            disabled={longer === settings.minutes}
            onPress={() => onChange({ minutes: longer })}
          />
        </View>
      </ControlRow>

      <ControlRow title="In whose words">
        <ChipRow
          options={STYLE_OPTIONS}
          selected={settings.style}
          onSelect={(style) => onChange({ style })}
        />
        <Text className="text-sm text-ink-soft">{STYLE_COPY[settings.style].body}</Text>
      </ControlRow>

      <ControlRow title="Angle">
        <ChipRow
          options={ANGLE_OPTIONS}
          selected={settings.angle}
          onSelect={(angle) => onChange({ angle })}
        />
      </ControlRow>

      {/* The way back, which the old panel had no version of: once a card had
          been asked for a different way there was no returning to the plain one. */}
      {changed ? <Button label="Back to how the topic is written" tone="quiet" onPress={onReset} /> : null}
    </Card>
  );
}
