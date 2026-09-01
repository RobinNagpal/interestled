import { describe, expect, it } from "vitest";
import {
  MarkdownBlockKind,
  MarkdownSpanKind,
  linkTarget,
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

describe("linkTarget", () => {
  it("opens the schemes a reference actually uses", () => {
    expect(linkTarget("https://kubernetes.io/docs")).toBe("https://kubernetes.io/docs");
    expect(linkTarget("http://example.com")).toBe("http://example.com");
    expect(linkTarget("mailto:someone@example.com")).toBe("mailto:someone@example.com");
  });

  it("gives a bare domain the scheme it meant", () => {
    expect(linkTarget("kubernetes.io/docs")).toBe("https://kubernetes.io/docs");
  });

  it("refuses anything that would run rather than open", () => {
    // The href is model-written, and the model is steerable by the learner's own
    // standing instructions, so this is the one place content could ask the app
    // to execute something.
    expect(linkTarget("javascript:alert(1)")).toBeNull();
    expect(linkTarget("  JavaScript:alert(1)")).toBeNull();
    expect(linkTarget("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(linkTarget("file:///etc/passwd")).toBeNull();
    expect(linkTarget("")).toBeNull();
  });
});

describe("plainText", () => {
  it("strips the marks for the places that can only take a string", () => {
    expect(plainText("**Pods** are `ephemeral`\n\n- and they are replaced")).toBe(
      "Pods are ephemeral and they are replaced",
    );
  });

  it("comes back as one line, whatever it was", () => {
    // It fills the resume card, which holds a single line.
    expect(plainText("Run:\n\n```sh\nkubectl get pods\nkubectl top pods\n```")).toBe(
      "Run: kubectl get pods kubectl top pods",
    );
  });
});

describe("the shapes a model actually produces", () => {
  it("keeps a table as text, since nothing renders one", () => {
    // The system prompt bans tables; one arriving anyway must not vanish.
    const blocks = parseMarkdown("| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(kinds(blocks)).toEqual([MarkdownBlockKind.Paragraph]);
    expect(plainText("| a | b |")).toContain("a");
  });

  it("keeps a code block written inside a list item", () => {
    const list = firstList(
      parseMarkdown("1. Run it:\n\n   ```sh\n   kubectl get pods\n   ```\n\n2. Then check."),
    );
    if (list.kind !== MarkdownBlockKind.OrderedList) {
      throw new Error("expected an ordered list");
    }
    expect(list.items).toHaveLength(2);
    expect(kinds(list.items[0]!.blocks)).toEqual([
      MarkdownBlockKind.Paragraph,
      MarkdownBlockKind.Code,
    ]);
  });

  it("reads a list inside a quote", () => {
    const [quote] = parseMarkdown("> quoted\n> - with a list\n> - inside it");
    if (quote?.kind !== MarkdownBlockKind.Quote) {
      throw new Error("expected a quote");
    }
    expect(kinds(quote.blocks)).toEqual([
      MarkdownBlockKind.Paragraph,
      MarkdownBlockKind.BulletList,
    ]);
  });

  it("keeps an item with nothing in it, rather than losing the one after it", () => {
    const list = firstList(parseMarkdown("- \n- item after an empty bullet"));
    if (list.kind !== MarkdownBlockKind.BulletList) {
      throw new Error("expected a bullet list");
    }
    expect(list.items).toHaveLength(2);
    expect(list.items[0]!.blocks).toEqual([]);
    expect(plainText("- \n- item after an empty bullet")).toBe("item after an empty bullet");
  });

  it("numbers past nine, where a fixed-width gutter used to wrap", () => {
    const text = Array.from({ length: 12 }, (_, index) => `${index + 1}. step`).join("\n");
    const list = firstList(parseMarkdown(text));
    if (list.kind !== MarkdownBlockKind.OrderedList) {
      throw new Error("expected an ordered list");
    }
    expect(list.items).toHaveLength(12);
  });
});

/** Deterministic, so a failure here is a failure anyone can reproduce. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomText(next: () => number, chars: readonly string[], length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += chars[Math.floor(next() * chars.length)]!;
  }
  return out;
}

/**
 * The model writes whatever it writes, and a card that throws is a card the
 * learner cannot read at all. These are the two properties that matter: it
 * always finishes, and it never silently eats the text.
 */
describe("whatever the model writes", () => {
  const MARKS = [..."abc *_`~#>-+.!()[]\\|123\n \t"];
  // Fences carry an info string that is structure rather than prose, so they are
  // left out of the "nothing is lost" run and covered by their own test above.
  const NO_FENCES = [..."abc *_#>-+.\n \t"];

  it("always finishes, whatever it is given", () => {
    const next = rng(12345);
    for (let round = 0; round < 2000; round += 1) {
      const text = randomText(next, MARKS, 1 + Math.floor(next() * 120));
      const started = Date.now();
      expect(Array.isArray(parseMarkdown(text))).toBe(true);
      expect(Date.now() - started).toBeLessThan(500);
    }
  });

  it("never drops a letter on the way through", () => {
    const next = rng(777);
    for (let round = 0; round < 2000; round += 1) {
      const text = randomText(next, NO_FENCES, 1 + Math.floor(next() * 120));
      expect(plainText(text).replace(/[^a-z]/g, "")).toBe(text.replace(/[^a-z]/g, ""));
    }
  });

  it("does not stall on the pathological cases", () => {
    const cases = [
      "*".repeat(400),
      "`".repeat(400),
      "**".repeat(200),
      "[a](".repeat(100),
      "- ".repeat(200),
      "> ".repeat(200),
      "  ".repeat(200) + "- deep",
      "```".repeat(50),
      "*a".repeat(300),
      "a".repeat(5000),
    ];
    const started = Date.now();
    for (const text of cases) {
      parseMarkdown(text);
      plainText(text);
    }
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
