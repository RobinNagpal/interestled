/**
 * The Markdown the model writes, turned into something React Native can draw.
 *
 * Everything the LLM returns is Markdown — `kubectl get pods`, **the one thing
 * that matters**, a list of three parallel items — and a `<Text>` renders those
 * as the asterisks and backticks they are. What is needed is small and known:
 * the block shapes below and the inline ones under them, which is what the
 * system prompt asks the model to stay inside.
 *
 * Written here rather than pulled in because every React Native Markdown package
 * either brings its own renderer (which then has to be styled twice, once for
 * the app and once for itself) or a full CommonMark parser for a body of text
 * that is at most a few hundred words. The strictness is also the point: an
 * unclosed `**` stays literal text rather than swallowing the rest of the card.
 */

export enum MarkdownBlockKind {
  Paragraph = "paragraph",
  Heading = "heading",
  BulletList = "bullet_list",
  OrderedList = "ordered_list",
  Code = "code",
  Quote = "quote",
  Rule = "rule",
}

export enum MarkdownSpanKind {
  Text = "text",
  Code = "code",
  Strong = "strong",
  Emphasis = "emphasis",
  Strike = "strike",
  Link = "link",
}

export interface TextSpanT {
  kind: MarkdownSpanKind.Text;
  text: string;
}

export interface CodeSpanT {
  kind: MarkdownSpanKind.Code;
  text: string;
}

export interface StrongSpanT {
  kind: MarkdownSpanKind.Strong;
  children: MarkdownSpanT[];
}

export interface EmphasisSpanT {
  kind: MarkdownSpanKind.Emphasis;
  children: MarkdownSpanT[];
}

export interface StrikeSpanT {
  kind: MarkdownSpanKind.Strike;
  children: MarkdownSpanT[];
}

export interface LinkSpanT {
  kind: MarkdownSpanKind.Link;
  href: string;
  children: MarkdownSpanT[];
}

export type MarkdownSpanT =
  | TextSpanT
  | CodeSpanT
  | StrongSpanT
  | EmphasisSpanT
  | StrikeSpanT
  | LinkSpanT;

/** A list item is a document of its own, so nested lists cost nothing extra. */
export interface MarkdownListItemT {
  blocks: MarkdownBlockT[];
}

export interface ParagraphBlockT {
  kind: MarkdownBlockKind.Paragraph;
  spans: MarkdownSpanT[];
}

export interface HeadingBlockT {
  kind: MarkdownBlockKind.Heading;
  /** 1-6, as written. */
  level: number;
  spans: MarkdownSpanT[];
}

export interface BulletListBlockT {
  kind: MarkdownBlockKind.BulletList;
  items: MarkdownListItemT[];
}

export interface OrderedListBlockT {
  kind: MarkdownBlockKind.OrderedList;
  /** The first number written, so "3." keeps counting from three. */
  start: number;
  items: MarkdownListItemT[];
}

export interface CodeBlockT {
  kind: MarkdownBlockKind.Code;
  language: string;
  text: string;
}

export interface QuoteBlockT {
  kind: MarkdownBlockKind.Quote;
  blocks: MarkdownBlockT[];
}

export interface RuleBlockT {
  kind: MarkdownBlockKind.Rule;
}

export type MarkdownBlockT =
  | ParagraphBlockT
  | HeadingBlockT
  | BulletListBlockT
  | OrderedListBlockT
  | CodeBlockT
  | QuoteBlockT
  | RuleBlockT;

const BLANK = /^[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)[ \t]*$/;
const RULE = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;
const QUOTE = /^ {0,3}>[ \t]?(.*)$/;
const BULLET = /^( *)([-*+])[ \t]+(.*)$/;
const ORDERED = /^( *)(\d{1,9})[.)][ \t]+(.*)$/;
const HARD_BREAK = / {2,}$/;
const WORD = /[\w]/;
const SPACE = /\s/;
/** What a backslash may escape. Anything else keeps its backslash. */
const ESCAPABLE = /[\\`*_{}[\]()#+\-.!~>|]/;

/** Tabs are indentation here, and four spaces is what every list writer means by one. */
function linesOf(source: string): string[] {
  return source.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** Whether this line ends the paragraph above it by starting something else. */
function startsBlock(line: string): boolean {
  return (
    BLANK.test(line) ||
    FENCE.test(line) ||
    RULE.test(line) ||
    HEADING.test(line) ||
    QUOTE.test(line) ||
    BULLET.test(line) ||
    ORDERED.test(line)
  );
}

/**
 * Soft line breaks join with a space, the way Markdown means them — a model that
 * wraps at eighty columns is not asking for eighty-column lines on a phone. Two
 * trailing spaces is the one way to ask for the break to be kept.
 */
function joinLines(lines: readonly string[]): string {
  return lines
    .map((line, index) => {
      const text = line.trim();
      if (index === lines.length - 1) {
        return text;
      }
      return HARD_BREAK.test(line) ? `${text}\n` : `${text} `;
    })
    .join("");
}

export function parseMarkdown(source: string): MarkdownBlockT[] {
  return parseBlocks(linesOf(source));
}

function parseBlocks(lines: readonly string[]): MarkdownBlockT[] {
  const blocks: MarkdownBlockT[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    if (BLANK.test(line)) {
      index += 1;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence !== null) {
      const read = readFence(lines, index, fence[1]!, fence[2] ?? "");
      blocks.push(read.block);
      index = read.next;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ kind: MarkdownBlockKind.Rule });
      index += 1;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading !== null) {
      blocks.push({
        kind: MarkdownBlockKind.Heading,
        level: heading[1]!.length,
        spans: parseSpans(heading[2]!),
      });
      index += 1;
      continue;
    }
    if (QUOTE.test(line)) {
      const read = readQuote(lines, index);
      blocks.push(read.block);
      index = read.next;
      continue;
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const read = readList(lines, index);
      blocks.push(read.block);
      index = read.next;
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && !startsBlock(lines[index]!)) {
      paragraph.push(lines[index]!);
      index += 1;
    }
    blocks.push({ kind: MarkdownBlockKind.Paragraph, spans: parseSpans(joinLines(paragraph)) });
  }
  return blocks;
}

/**
 * A fence that is never closed still ends at the end of the text rather than
 * throwing the rest of the card away — a truncated reply is the normal way this
 * happens, and the half that arrived is worth showing.
 */
function readFence(
  lines: readonly string[],
  start: number,
  marker: string,
  language: string,
): { block: CodeBlockT; next: number } {
  const body: string[] = [];
  let index = start + 1;
  while (index < lines.length) {
    const line = lines[index]!;
    const closing = FENCE.exec(line);
    const run = closing?.[1];
    if (run !== undefined && run.startsWith(marker[0]!) && run.length >= marker.length) {
      index += 1;
      break;
    }
    body.push(line);
    index += 1;
  }
  return {
    block: { kind: MarkdownBlockKind.Code, language, text: body.join("\n").replace(/\n+$/, "") },
    next: index,
  };
}

function readQuote(lines: readonly string[], start: number): { block: QuoteBlockT; next: number } {
  const body: string[] = [];
  let index = start;
  while (index < lines.length) {
    const quoted = QUOTE.exec(lines[index]!);
    if (quoted === null) {
      break;
    }
    body.push(quoted[1]!);
    index += 1;
  }
  return { block: { kind: MarkdownBlockKind.Quote, blocks: parseBlocks(body) }, next: index };
}

interface Marker {
  /** Where the item's own text starts, measured from the left edge. */
  contentIndent: number;
  indent: number;
  ordered: boolean;
  number: number;
  text: string;
}

function markerOf(line: string): Marker | null {
  const bullet = BULLET.exec(line);
  if (bullet !== null && !RULE.test(line)) {
    const indent = bullet[1]!.length;
    return {
      indent,
      contentIndent: line.length - bullet[3]!.length,
      ordered: false,
      number: 0,
      text: bullet[3]!,
    };
  }
  const ordered = ORDERED.exec(line);
  if (ordered !== null) {
    const indent = ordered[1]!.length;
    return {
      indent,
      contentIndent: line.length - ordered[3]!.length,
      ordered: true,
      number: Number(ordered[2]!),
      text: ordered[3]!,
    };
  }
  return null;
}

/**
 * One list, and everything each item holds. Item bodies are collected as lines
 * and parsed as documents of their own, so a nested list, a second paragraph and
 * a fenced block inside an item all work without a case here for each.
 */
function readList(
  lines: readonly string[],
  start: number,
): { block: BulletListBlockT | OrderedListBlockT; next: number } {
  const first = markerOf(lines[start]!)!;
  const items: MarkdownListItemT[] = [];
  let body: string[] = [];
  let index = start;
  let contentIndent = first.contentIndent;

  const close = (): void => {
    if (body.length > 0) {
      items.push({ blocks: parseBlocks(body) });
      body = [];
    }
  };

  while (index < lines.length) {
    const line = lines[index]!;
    if (BLANK.test(line)) {
      // A blank line only continues the list if what follows still belongs to it.
      const following = lines.slice(index + 1).find((next) => !BLANK.test(next));
      if (
        following === undefined ||
        (indentOf(following) < contentIndent && markerOf(following)?.indent !== first.indent)
      ) {
        break;
      }
      body.push("");
      index += 1;
      continue;
    }
    const marker = markerOf(line);
    if (marker !== null && marker.indent <= first.indent) {
      // A sibling of a different kind is a new list, not another item of this one.
      if (marker.ordered !== first.ordered) {
        break;
      }
      close();
      contentIndent = marker.contentIndent;
      body.push(marker.text);
      index += 1;
      continue;
    }
    if (indentOf(line) >= contentIndent) {
      body.push(line.slice(contentIndent));
      index += 1;
      continue;
    }
    // Anything else at the left edge ends the list, except plain prose, which is
    // the "lazy continuation" of the item above it.
    if (startsBlock(line)) {
      break;
    }
    body.push(line.trim());
    index += 1;
  }
  close();

  return {
    block: first.ordered
      ? { kind: MarkdownBlockKind.OrderedList, start: first.number, items }
      : { kind: MarkdownBlockKind.BulletList, items },
    next: index,
  };
}

/** A code span, or null when the run of backticks is never closed. */
function readCode(text: string, start: number): { text: string; end: number } | null {
  let ticks = 0;
  while (text[start + ticks] === "`") {
    ticks += 1;
  }
  const fence = "`".repeat(ticks);
  let index = start + ticks;
  while (index < text.length) {
    if (text.startsWith(fence, index) && text[index + ticks] !== "`") {
      const inner = text.slice(start + ticks, index);
      // One space either side is the way to write a span that itself starts or
      // ends with a backtick; it is padding, not content.
      const padded = inner.startsWith(" ") && inner.endsWith(" ") && inner.trim() !== "";
      const content = padded ? inner.slice(1, -1) : inner;
      return { text: content, end: index + ticks };
    }
    index += 1;
  }
  return null;
}

/** `[label](href)`, with nesting counted so a bracket inside the label survives. */
function readLink(
  text: string,
  start: number,
): { label: string; href: string; end: number } | null {
  let depth = 0;
  let index = start;
  let labelEnd = -1;
  while (index < text.length) {
    const char = text[index]!;
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        labelEnd = index;
        break;
      }
    }
    index += 1;
  }
  if (labelEnd === -1 || text[labelEnd + 1] !== "(") {
    return null;
  }
  let parens = 0;
  let cursor = labelEnd + 1;
  while (cursor < text.length) {
    const char = text[cursor]!;
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (char === "(") {
      parens += 1;
    } else if (char === ")") {
      parens -= 1;
      if (parens === 0) {
        // A title after the URL ("...") is dropped: nothing shows it.
        const target = text.slice(labelEnd + 2, cursor).trim().split(/\s+/)[0] ?? "";
        return { label: text.slice(start + 1, labelEnd), href: target, end: cursor + 1 };
      }
    }
    cursor += 1;
  }
  return null;
}

const DELIMITERS: readonly { marker: string; kind: MarkdownSpanKind }[] = [
  { marker: "~~", kind: MarkdownSpanKind.Strike },
  { marker: "**", kind: MarkdownSpanKind.Strong },
  { marker: "__", kind: MarkdownSpanKind.Strong },
  { marker: "*", kind: MarkdownSpanKind.Emphasis },
  { marker: "_", kind: MarkdownSpanKind.Emphasis },
];

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD.test(char);
}

/**
 * The closing delimiter, or -1. Code spans are skipped whole, so a `*` inside
 * one is a character rather than a delimiter, and the closer may not sit against
 * a space — "2 * 3 * 4" is arithmetic, not emphasis.
 */
function findClose(text: string, from: number, marker: string, wordBoundary: boolean): number {
  let index = from;
  while (index < text.length) {
    const char = text[index]!;
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "`") {
      const code = readCode(text, index);
      if (code !== null) {
        index = code.end;
        continue;
      }
    }
    if (text.startsWith(marker, index) && index > from) {
      const before = text[index - 1]!;
      const after = text[index + marker.length];
      if (!SPACE.test(before) && (!wordBoundary || !isWordChar(after))) {
        return index;
      }
    }
    index += 1;
  }
  return -1;
}

function readEmphasis(text: string, start: number): { span: MarkdownSpanT; end: number } | null {
  for (const { marker, kind } of DELIMITERS) {
    if (!text.startsWith(marker, start)) {
      continue;
    }
    // `_` never opens inside a word, so snake_case_names stay as written.
    const wordBoundary = marker.startsWith("_");
    if (wordBoundary && isWordChar(text[start - 1])) {
      continue;
    }
    const from = start + marker.length;
    if (from >= text.length || SPACE.test(text[from]!)) {
      continue;
    }
    const close = findClose(text, from, marker, wordBoundary);
    if (close === -1) {
      continue;
    }
    const children = parseSpans(text.slice(from, close));
    const end = close + marker.length;
    if (kind === MarkdownSpanKind.Strong) {
      return { span: { kind, children }, end };
    }
    if (kind === MarkdownSpanKind.Strike) {
      return { span: { kind, children }, end };
    }
    return { span: { kind: MarkdownSpanKind.Emphasis, children }, end };
  }
  return null;
}

/**
 * Inline Markdown. Everything that does not parse stays the characters it was:
 * a lone asterisk is an asterisk, and an unclosed backtick is a backtick.
 */
export function parseSpans(text: string): MarkdownSpanT[] {
  const spans: MarkdownSpanT[] = [];
  let plain = "";
  let index = 0;
  const flush = (): void => {
    if (plain !== "") {
      spans.push({ kind: MarkdownSpanKind.Text, text: plain });
      plain = "";
    }
  };
  while (index < text.length) {
    const char = text[index]!;
    if (char === "\\") {
      const next = text[index + 1];
      if (next !== undefined && ESCAPABLE.test(next)) {
        plain += next;
        index += 2;
        continue;
      }
    }
    if (char === "`") {
      const code = readCode(text, index);
      if (code !== null) {
        flush();
        spans.push({ kind: MarkdownSpanKind.Code, text: code.text });
        index = code.end;
        continue;
      }
    }
    // An image has nothing to show on a card, so it is drawn as its alt text.
    if (char === "!" && text[index + 1] === "[") {
      const image = readLink(text, index + 1);
      if (image !== null) {
        flush();
        spans.push(...parseSpans(image.label));
        index = image.end;
        continue;
      }
    }
    if (char === "[") {
      const link = readLink(text, index);
      if (link !== null) {
        flush();
        spans.push({
          kind: MarkdownSpanKind.Link,
          href: link.href,
          children: parseSpans(link.label),
        });
        index = link.end;
        continue;
      }
    }
    const emphasis = readEmphasis(text, index);
    if (emphasis !== null) {
      flush();
      spans.push(emphasis.span);
      index = emphasis.end;
      continue;
    }
    plain += char;
    index += 1;
  }
  flush();
  return spans;
}

/** The text of a parsed span tree, for a place that can only take a string. */
export function spansToText(spans: readonly MarkdownSpanT[]): string {
  return spans
    .map((span) => {
      switch (span.kind) {
        case MarkdownSpanKind.Text:
        case MarkdownSpanKind.Code:
          return span.text;
        case MarkdownSpanKind.Strong:
        case MarkdownSpanKind.Emphasis:
        case MarkdownSpanKind.Strike:
        case MarkdownSpanKind.Link:
          return spansToText(span.children);
      }
    })
    .join("");
}

/** Markdown with its marks taken off — for a preview line or an accessibility label. */
export function plainText(source: string): string {
  return parseMarkdown(source)
    .map(plainTextOfBlock)
    .filter((line) => line !== "")
    .join(" ");
}

function plainTextOfBlock(block: MarkdownBlockT): string {
  switch (block.kind) {
    case MarkdownBlockKind.Paragraph:
    case MarkdownBlockKind.Heading:
      return spansToText(block.spans);
    case MarkdownBlockKind.Code:
      return block.text;
    case MarkdownBlockKind.Quote:
      return block.blocks.map(plainTextOfBlock).join(" ");
    case MarkdownBlockKind.BulletList:
    case MarkdownBlockKind.OrderedList:
      return block.items.map((item) => item.blocks.map(plainTextOfBlock).join(" ")).join(" ");
    case MarkdownBlockKind.Rule:
      return "";
  }
}
