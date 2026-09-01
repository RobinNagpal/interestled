import { describe, expect, it } from "vitest";
import {
  MarkdownBlockKind,
  MarkdownSpanKind,
  parseMarkdown,
  parseSpans,
  plainText,
  spansToText,
} from "../src/markdown/parse";
import type { MarkdownBlockT } from "../src/markdown/parse";

/** The kinds of a document, so a test can say what shape it expects in one line. */
function kinds(blocks: readonly MarkdownBlockT[]): MarkdownBlockKind[] {
  return blocks.map((block) => block.kind);
}

function firstList(blocks: readonly MarkdownBlockT[]): MarkdownBlockT {
  const found = blocks.find(
    (block) =>
      block.kind === MarkdownBlockKind.BulletList || block.kind === MarkdownBlockKind.OrderedList,
  );
  if (found === undefined) {
    throw new Error("no list in the document");
  }
  return found;
}

describe("parseSpans", () => {
  it("reads the marks the model actually writes", () => {
    const spans = parseSpans("Run `kubectl get pods` to see **every** pod.");
    expect(spans.map((span) => span.kind)).toEqual([
      MarkdownSpanKind.Text,
      MarkdownSpanKind.Code,
      MarkdownSpanKind.Text,
      MarkdownSpanKind.Strong,
      MarkdownSpanKind.Text,
    ]);
    expect(spansToText(spans)).toBe("Run kubectl get pods to see every pod.");
  });

  it("nests, so a code span inside bold is both", () => {
    const [strong] = parseSpans("**the `--force` flag**");
    if (strong?.kind !== MarkdownSpanKind.Strong) {
      throw new Error("expected bold");
    }
    expect(strong.children.map((span) => span.kind)).toContain(MarkdownSpanKind.Code);
  });

  it("leaves an underscore inside a word alone", () => {
    // snake_case_names are the normal case in the subjects this app teaches.
    const spans = parseSpans("the column is node_id in learning_nodes");
    expect(spans).toEqual([
      { kind: MarkdownSpanKind.Text, text: "the column is node_id in learning_nodes" },
    ]);
  });

  it("leaves an asterisk that means multiplication alone", () => {
    expect(parseSpans("3 * 4 * 5")).toEqual([{ kind: MarkdownSpanKind.Text, text: "3 * 4 * 5" }]);
  });

  it("keeps an unclosed mark as the characters it is", () => {
    expect(spansToText(parseSpans("**not closed"))).toBe("**not closed");
    expect(spansToText(parseSpans("a `dangling tick"))).toBe("a `dangling tick");
  });

  it("honours a backslash escape", () => {
    expect(parseSpans("2 \\* 3")).toEqual([{ kind: MarkdownSpanKind.Text, text: "2 * 3" }]);
  });

  it("reads a link, and an image as its alt text", () => {
    const [link] = parseSpans("[the docs](https://k8s.io/docs)");
    if (link?.kind !== MarkdownSpanKind.Link) {
      throw new Error("expected a link");
    }
    expect(link.href).toBe("https://k8s.io/docs");
    expect(spansToText(link.children)).toBe("the docs");
    expect(spansToText(parseSpans("![a pod diagram](x.png)"))).toBe("a pod diagram");
  });

  it("keeps a backtick inside a longer code fence", () => {
    const [code] = parseSpans("``a ` b``");
    expect(code).toEqual({ kind: MarkdownSpanKind.Code, text: "a ` b" });
  });
});

describe("parseMarkdown", () => {
  it("joins a wrapped paragraph with spaces, and keeps a two-space break", () => {
    const [soft] = parseMarkdown("one line\nwrapped here");
    expect(soft?.kind === MarkdownBlockKind.Paragraph ? spansToText(soft.spans) : "").toBe(
      "one line wrapped here",
    );
    const [hard] = parseMarkdown("one line  \nkept apart");
    expect(hard?.kind === MarkdownBlockKind.Paragraph ? spansToText(hard.spans) : "").toBe(
      "one line\nkept apart",
    );
  });

  it("reads a bullet list, whichever marker it uses", () => {
    for (const marker of ["-", "*", "+"]) {
      const list = firstList(parseMarkdown(`${marker} one\n${marker} two`));
      if (list.kind !== MarkdownBlockKind.BulletList) {
        throw new Error("expected a bullet list");
      }
      expect(list.items).toHaveLength(2);
    }
  });

  it("counts an ordered list from the number that was written", () => {
    const list = firstList(parseMarkdown("3. third\n4. fourth"));
    if (list.kind !== MarkdownBlockKind.OrderedList) {
      throw new Error("expected an ordered list");
    }
    expect(list.start).toBe(3);
    expect(list.items).toHaveLength(2);
  });

  it("nests a list inside its item rather than flattening it", () => {
    const list = firstList(parseMarkdown("- outer\n  - inner one\n  - inner two\n- second"));
    if (list.kind !== MarkdownBlockKind.BulletList) {
      throw new Error("expected a bullet list");
    }
    expect(list.items).toHaveLength(2);
    expect(kinds(list.items[0]!.blocks)).toEqual([
      MarkdownBlockKind.Paragraph,
      MarkdownBlockKind.BulletList,
    ]);
  });

  it("separates a paragraph from the list that follows it", () => {
    expect(kinds(parseMarkdown("Two things matter:\n- one\n- two"))).toEqual([
      MarkdownBlockKind.Paragraph,
      MarkdownBlockKind.BulletList,
    ]);
  });

  it("keeps a fenced block whole, newlines and all", () => {
    const [block] = parseMarkdown("```sh\nkubectl get pods\nkubectl describe pod x\n```");
    expect(block).toEqual({
      kind: MarkdownBlockKind.Code,
      language: "sh",
      text: "kubectl get pods\nkubectl describe pod x",
    });
  });

  it("closes a truncated fence at the end rather than losing the text", () => {
    // A reply cut off mid-block is the normal way this happens.
    const [block] = parseMarkdown("```\nhalf a command");
    expect(block?.kind === MarkdownBlockKind.Code ? block.text : "").toBe("half a command");
  });

  it("reads headings, quotes and rules", () => {
    expect(kinds(parseMarkdown("## Why\n\n> because\n\n---\n\ntext"))).toEqual([
      MarkdownBlockKind.Heading,
      MarkdownBlockKind.Quote,
      MarkdownBlockKind.Rule,
      MarkdownBlockKind.Paragraph,
    ]);
  });

  it("does not mistake a horizontal rule for a bullet", () => {
    expect(kinds(parseMarkdown("---"))).toEqual([MarkdownBlockKind.Rule]);
  });

  it("returns nothing for empty text, so a caller can draw nothing", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("   \n\n ")).toEqual([]);
  });
});

describe("plainText", () => {
  it("strips the marks for the places that can only take a string", () => {
    expect(plainText("**Pods** are `ephemeral`\n\n- and they are replaced")).toBe(
      "Pods are ephemeral and they are replaced",
    );
  });
});
