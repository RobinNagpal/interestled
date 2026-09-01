import { Fragment } from "react";
import { Linking, Platform, ScrollView, Text, View } from "react-native";
import type { ReactElement, ReactNode } from "react";
import {
  MarkdownBlockKind,
  MarkdownSpanKind,
  parseMarkdown,
  parseSpans,
} from "../markdown/parse";
import type { MarkdownBlockT, MarkdownListItemT, MarkdownSpanT } from "../markdown/parse";

/**
 * Everything the model writes is Markdown, so everything it writes is drawn
 * through here. The alternative is what a plain `<Text>` does with it: the
 * asterisks and backticks stay on the screen, and a list arrives as one long
 * line — which is the map lying about the content the same way a wrong minute
 * count lies about the time.
 *
 * The type scale comes from the caller rather than from here. A card claim, a
 * drill prompt and a review answer are three different sizes of the same
 * content, and a component that decided that for itself would need a variant per
 * screen.
 */

/** React Native has no default monospace family; each platform names its own. */
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const HEADING_CLASS: Record<number, string> = {
  1: "text-xl font-semibold text-ink",
  2: "text-lg font-semibold text-ink",
  3: "text-base font-semibold text-ink",
  4: "text-base font-semibold text-ink",
  5: "text-sm font-semibold text-ink",
  6: "text-sm font-semibold text-ink",
};

function openLink(href: string): void {
  // A link that cannot be opened must not take the screen down with it.
  void Linking.openURL(href).catch(() => undefined);
}

function Spans({ spans }: { spans: readonly MarkdownSpanT[] }): ReactElement {
  return (
    <>
      {spans.map((span, index) => (
        <Fragment key={index}>{renderSpan(span)}</Fragment>
      ))}
    </>
  );
}

function renderSpan(span: MarkdownSpanT): ReactNode {
  switch (span.kind) {
    case MarkdownSpanKind.Text:
      return span.text;
    case MarkdownSpanKind.Code:
      return (
        <Text className="bg-surface-sunken text-ink" style={{ fontFamily: MONO }}>
          {span.text}
        </Text>
      );
    case MarkdownSpanKind.Strong:
      return (
        <Text className="font-semibold">
          <Spans spans={span.children} />
        </Text>
      );
    case MarkdownSpanKind.Emphasis:
      return (
        <Text className="italic">
          <Spans spans={span.children} />
        </Text>
      );
    case MarkdownSpanKind.Strike:
      return (
        <Text className="line-through">
          <Spans spans={span.children} />
        </Text>
      );
    case MarkdownSpanKind.Link:
      return (
        <Text className="text-accent underline" onPress={() => openLink(span.href)}>
          <Spans spans={span.children} />
        </Text>
      );
  }
}

/** The default body style, so most callers pass nothing. */
const BODY = "text-base leading-6 text-ink";

export interface MarkdownProps {
  text: string;
  /** Type scale and colour for the prose. Headings and code keep their own. */
  className?: string;
}

/**
 * One line of Markdown, rendered inside a single `<Text>`: a claim, a gloss, a
 * hint. Block structure is ignored on purpose — these are places where the
 * layout is already decided and a stray "- " must not turn into a list.
 */
export function InlineMarkdown({
  text,
  className = BODY,
  numberOfLines,
}: MarkdownProps & { numberOfLines?: number }): ReactElement {
  return (
    <Text className={className} numberOfLines={numberOfLines}>
      <Spans spans={parseSpans(text)} />
    </Text>
  );
}

/**
 * A block of Markdown: paragraphs, lists, code, the lot. A single paragraph
 * renders as a bare `<Text>` so the common case has exactly the layout the plain
 * text had before, and nothing on the screen shifts.
 */
export function Markdown({ text, className = BODY }: MarkdownProps): ReactElement | null {
  const blocks = parseMarkdown(text);
  if (blocks.length === 0) {
    return null;
  }
  const only = blocks[0];
  if (blocks.length === 1 && only !== undefined && only.kind === MarkdownBlockKind.Paragraph) {
    return (
      <Text className={className}>
        <Spans spans={only.spans} />
      </Text>
    );
  }
  return <Blocks blocks={blocks} className={className} />;
}

function Blocks({
  blocks,
  className,
}: {
  blocks: readonly MarkdownBlockT[];
  className: string;
}): ReactElement {
  return (
    <View className="gap-2">
      {blocks.map((block, index) => (
        <Fragment key={index}>{renderBlock(block, className)}</Fragment>
      ))}
    </View>
  );
}

function renderBlock(block: MarkdownBlockT, className: string): ReactElement {
  switch (block.kind) {
    case MarkdownBlockKind.Paragraph:
      return (
        <Text className={className}>
          <Spans spans={block.spans} />
        </Text>
      );
    case MarkdownBlockKind.Heading:
      return (
        <Text className={HEADING_CLASS[block.level] ?? HEADING_CLASS[3]!}>
          <Spans spans={block.spans} />
        </Text>
      );
    case MarkdownBlockKind.BulletList:
      return (
        <List
          items={block.items}
          className={className}
          markerOf={() => "•"}
        />
      );
    case MarkdownBlockKind.OrderedList:
      return (
        <List
          items={block.items}
          className={className}
          markerOf={(index) => `${block.start + index}.`}
        />
      );
    case MarkdownBlockKind.Code:
      // Code is the one thing that must not be re-wrapped: a broken command is
      // a command that does not run. It scrolls sideways instead.
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="rounded-card bg-surface-sunken"
          contentContainerClassName="p-3"
        >
          <Text className="text-sm leading-5 text-ink" style={{ fontFamily: MONO }}>
            {block.text}
          </Text>
        </ScrollView>
      );
    case MarkdownBlockKind.Quote:
      return (
        <View className="border-l-2 border-line-strong pl-3">
          <Blocks blocks={block.blocks} className={className} />
        </View>
      );
    case MarkdownBlockKind.Rule:
      return <View className="h-px bg-line" />;
  }
}

function List({
  items,
  className,
  markerOf,
}: {
  items: readonly MarkdownListItemT[];
  className: string;
  markerOf: (index: number) => string;
}): ReactElement {
  return (
    <View className="gap-1">
      {items.map((item, index) => (
        <View key={index} className="flex-row gap-2">
          <Text className={`${className} w-5 text-right`}>{markerOf(index)}</Text>
          <View className="flex-1">
            <Blocks blocks={item.blocks} className={className} />
          </View>
        </View>
      ))}
    </View>
  );
}
