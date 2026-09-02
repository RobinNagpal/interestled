import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactElement, ReactNode } from "react";
import { router } from "expo-router";
import { useCard, useRewriteCard } from "@interestled/api";
import { defaultCardSettings, drillHref, nodeHref, sameCardSettings } from "@interestled/domain";
import {
  ANGLE_OPTIONS,
  Button,
  Card,
  cardMinuteOptions,
  DEPTH_OPTIONS,
  Disclosure,
  ENGLISH_COPY,
  ENGLISH_OPTIONS,
  ErrorState,
  FORMAT_COPY,
  FORMAT_OPTIONS,
  InlineMarkdown,
  JargonList,
  LoadingContent,
  Markdown,
  PARAGRAPH_NOTE,
  PARAGRAPH_OPTIONS,
  Screen,
  SectionTitle,
  settingsSummary,
  TECHNICAL_COPY,
  TECHNICAL_OPTIONS,
} from "@interestled/ui";
import { CardDepth, CardMinutes, DEFAULT_CARD_DEPTH } from "@interestled/schemas";
import type { CardSettingsT, LearningNodeT, TopicT } from "@interestled/schemas";
import { ChipRow } from "./ChipRow";
import { useAuth } from "../lib/auth";
import { messageOf } from "../lib/errors";

/**
 * One concept, one screen, always the same slots in the same order. Opening it
 * marks the node Seen and nothing further — reading can never complete a node,
 * or the map stops being honest and everything resting on it collapses.
 */
export function NodeCard({
  topicSlug,
  topic,
  node,
  nodes,
}: {
  topicSlug: string;
  topic: TopicT;
  node: LearningNodeT;
  nodes: readonly LearningNodeT[];
}): ReactElement {
  // Two states, not one. `applied` is what the card on screen was asked for —
  // an empty object is the card as the topic is written, which is what a fresh
  // arrival must get. `draft` is where the chips stand, which is only a request
  // until the button under them is pressed: writing a card takes ten to thirty
  // seconds and a model call, so a panel that wrote one per chip could not be
  // adjusted twice, and the second half of a change was always paid for as a
  // card nobody wanted.
  const [applied, setApplied] = useState<Partial<CardSettingsT>>({});
  const [draft, setDraft] = useState<Partial<CardSettingsT>>({});
  const card = useCard(node.id, applied);
  const rewrite = useRewriteCard(node.id);
  const { user } = useAuth();

  if (card.isPending) {
    // The same rule the server writes to, so the wait names the card that
    // actually arrives rather than a guess at it.
    const asking = {
      ...defaultCardSettings(topic, node, user?.defaultDepth ?? DEFAULT_CARD_DEPTH),
      ...applied,
    };
    return (
      <LoadingContent
        label={`Writing the card for ${node.title}…`}
        detail={settingsSummary(asking)}
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
  // Where the chips stand: what the card in front of them was written to, with
  // anything moved since on top. Reading them off the response alone would put
  // a chip back the moment it was pressed, since nothing has been written yet.
  const chosen: CardSettingsT = { ...settings, ...draft };
  // The card as the topic is written, which is what "back to how the topic is
  // written" moves the chips to — and the same rule the server resolves an
  // unanswered setting by, so the two cannot describe different cards.
  const asWritten = defaultCardSettings(topic, node, user?.defaultDepth ?? DEFAULT_CARD_DEPTH);
  // The chips are ahead of the card on screen: there is something to write.
  const unwritten = !sameCardSettings(chosen, settings);
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]));

  return (
    <Screen contentContainerClassName="gap-5 p-4">
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

      {/* One card rather than one per section: the sections are a single
          argument in order, and boxing each of them draws the seams the prompt
          spends its length trying to write across. The heading is set as a
          heading and never parsed as Markdown — it is a title, like every other
          title in the product. */}
      <Card className="gap-4">
        <SectionTitle>Why it behaves this way</SectionTitle>
        {content.mechanism.map((section, index) => (
          <View key={index} className="gap-1">
            <Text className="text-base font-semibold text-ink">{section.heading}</Text>
            <Markdown text={section.body} />
          </View>
        ))}
      </Card>

      {/* Both of these are written only where the node has one. A heading over
          the node restated in other words is worse than no heading: it promises
          something new and delivers the paragraph just read. */}
      {content.example === undefined ? null : (
        <Card className="gap-2">
          <SectionTitle>Concretely</SectionTitle>
          <Markdown text={content.example.setup} />
          <Markdown
            text={`→ ${content.example.result}`}
            className="text-base leading-6 text-ink-soft"
          />
        </Card>
      )}

      {content.misconception === undefined ? null : (
        <Card className="gap-2">
          <SectionTitle>What people get wrong</SectionTitle>
          <Markdown
            text={content.misconception.belief}
            className="text-base leading-6 text-ink-soft"
          />
          <Markdown text={content.misconception.correction} />
        </Card>
      )}

      <JargonList terms={content.jargon} />

      <CardControls
        settings={chosen}
        unwritten={unwritten}
        rewriting={card.isPlaceholderData || card.isFetching || rewrite.isPending}
        // The one press that reaches the model, and only when it has to: at
        // settings the card was not written to it asks for that card, which the
        // cache may already hold; at the settings it already has there is
        // nothing to fetch, so it asks for the same card to be written again.
        onRegenerate={() => {
          rewrite.reset();
          if (unwritten) {
            setApplied(draft);
          } else {
            rewrite.mutate(applied);
          }
        }}
        rewriteError={rewrite.error === null ? undefined : messageOf(rewrite.error)}
        changed={!sameCardSettings(chosen, asWritten)}
        onChange={(change) => {
          rewrite.reset();
          setDraft((current) => ({ ...current, ...change }));
        }}
        // Moves the chips back, like every other control here. The card on
        // screen is still the one that was written until the button is pressed.
        onReset={() => setDraft(asWritten)}
      />

      <Button label="Now prove it" onPress={() => router.push(drillHref(topicSlug, node.path))} />
    </Screen>
  );
}


function ControlRow({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <View className="gap-2">
      <SectionTitle>{title}</SectionTitle>
      {children}
      {note === undefined ? null : <Text className="text-sm text-ink-soft">{note}</Text>}
    </View>
  );
}

/**
 * Everything that decides how this card came out, as the same rows of chips the
 * topic's own settings screen offers, in the same order and out of the same
 * copy. Depth and angle are the two a card has and a topic does not.
 *
 * Chips rather than the pair of step buttons this used to be: "Simpler" and
 * "Deeper" could move the depth but never say where it stood, so the only
 * statement of what the card was written to was the summary line on the closed
 * row — and half of the scale was somewhere the reader had to press twice to
 * find out about. A chip row says both at once, and it says it in the shape
 * the settings screen already taught.
 *
 * Nothing here writes a card. Every chip moves the panel and the panel alone;
 * the button at the bottom is what asks for one.
 */
function CardControls({
  settings,
  unwritten,
  rewriting,
  changed,
  onChange,
  onReset,
  onRegenerate,
  rewriteError,
}: {
  /** Where the chips stand, which is not what is on screen until it is written. */
  settings: CardSettingsT;
  /** The chips are ahead of the card: pressing the button writes a different one. */
  unwritten: boolean;
  /** The card on screen is the previous one; the next is being written. */
  rewriting: boolean;
  /** The chips are somewhere other than how the topic is written. */
  changed: boolean;
  onChange: (change: Partial<CardSettingsT>) => void;
  onReset: () => void;
  onRegenerate: () => void;
  rewriteError?: string;
}): ReactElement {
  return (
    <Disclosure
      title="How this card is written"
      // What the closed row says about what is inside. Folding the panel away
      // behind a title alone would make it something the reader has to open to
      // find out whether it holds anything they want — and this is also the one
      // place the settings the card was actually written to are ever stated.
      summary={
        rewriting
          ? "Writing it…"
          : unwritten
            ? `${settingsSummary(settings)} — not written yet`
            : settingsSummary(settings)
      }
    >
      {rewriting ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator color="#2563eb" />
          <Text className="text-xs text-ink-soft">Writing the next one…</Text>
        </View>
      ) : null}

      <ControlRow
        title="Depth"
        note="How far one explanation digs. It follows you through the topic, so the next card starts nearer where this one left you."
      >
        <ChipRow
          options={DEPTH_OPTIONS}
          selected={String(settings.depth)}
          onSelect={(value) => onChange({ depth: CardDepth.parse(Number(value)) })}
        />
      </ControlRow>

      <ControlRow title="English" note={ENGLISH_COPY[settings.englishLevel].body}>
        <ChipRow
          options={ENGLISH_OPTIONS}
          selected={settings.englishLevel}
          onSelect={(englishLevel) => onChange({ englishLevel })}
        />
      </ControlRow>

      <ControlRow title="Technical detail" note={TECHNICAL_COPY[settings.technicalDetail].body}>
        <ChipRow
          options={TECHNICAL_OPTIONS}
          selected={settings.technicalDetail}
          onSelect={(technicalDetail) => onChange({ technicalDetail })}
        />
      </ControlRow>

      <ControlRow title="Shape" note={FORMAT_COPY[settings.format].body}>
        <ChipRow
          options={FORMAT_OPTIONS}
          selected={settings.format}
          onSelect={(format) => onChange({ format })}
        />
      </ControlRow>

      <ControlRow title="How long a paragraph runs" note={PARAGRAPH_NOTE}>
        <ChipRow
          options={PARAGRAPH_OPTIONS}
          selected={settings.paragraphLength}
          onSelect={(paragraphLength) => onChange({ paragraphLength })}
        />
      </ControlRow>

      {/* The ladder cut to what one card may be written to. Past that the extra
          time is the drill and the doing, not more card. */}
      <ControlRow
        title="How long this card should take"
        note="Longer arrives as more of the explanation, never as longer paragraphs."
      >
        <ChipRow
          options={cardMinuteOptions(settings.minutes)}
          selected={String(settings.minutes)}
          onSelect={(value) => onChange({ minutes: CardMinutes.parse(Number(value)) })}
        />
      </ControlRow>

      <ControlRow title="Angle" note="The same depth, asked a different way.">
        <ChipRow
          options={ANGLE_OPTIONS}
          selected={settings.angle}
          onSelect={(angle) => onChange({ angle })}
        />
      </ControlRow>

      {/* The only control here that costs anything. Moving a chip used to write
          a card on the spot, which made a second change a second wait and a
          second model call — and gave nobody a way to ask for the same card
          again, which generation being non-deterministic is the whole reason to
          want. One button answers both. */}
      <View className="gap-2">
        <SectionTitle>Write it</SectionTitle>
        {/* Said above the button rather than under it: it is what the press is
            about to do, which is no use read afterwards. */}
        <Text className="text-sm text-ink-soft">
          {unwritten
            ? "Nothing is written until you press this, so move as many of these as you want first."
            : "The card you are reading is already written to these. Pressing this asks for it again, and it comes back written differently."}
        </Text>
        <Button
          label={rewriting ? "Writing it…" : unwritten ? "Regenerate" : "Write it again"}
          busy={rewriting}
          onPress={onRegenerate}
        />
        {rewriteError === undefined ? null : <ErrorState message={rewriteError} />}
      </View>

      {/* The way back, which the old panel had no version of: once a card had
          been asked for a different way there was no returning to the plain one. */}
      {changed ? (
        <Button label="Back to how the topic is written" tone="quiet" onPress={onReset} />
      ) : null}
    </Disclosure>
  );
}
