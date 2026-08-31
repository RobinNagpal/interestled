import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TemplateError, render } from "../src/llm/template";
import { promptFile } from "../src/llm/promptFiles";

describe("render", () => {
  it("fills a hole", () => {
    expect(render("Hello {{name}}.", { name: "world" })).toBe("Hello world.");
    expect(render("Hello {{ name }}.", { name: "world" })).toBe("Hello world.");
  });

  it("keeps a section when the value is there and drops it when it is not", () => {
    const template = "a{{#x}} and {{x}}{{/x}}b";
    expect(render(template, { x: "this" })).toBe("a and thisb");
    expect(render(template, { x: "" })).toBe("ab");
    // Whitespace is not a value: a blank line would read as a stated answer.
    expect(render(template, { x: "   " })).toBe("ab");
  });

  it("inverts a section, which is how the two sides of a question are written", () => {
    const template = "{{^x}}nothing said{{/x}}{{#x}}{{x}}{{/x}}";
    expect(render(template, { x: "" })).toBe("nothing said");
    expect(render(template, { x: "something" })).toBe("something");
  });

  it("resolves a section inside a section", () => {
    const template = "{{#a}}A{{#b}}B{{/b}}{{/a}}";
    expect(render(template, { a: "y", b: "y" })).toBe("AB");
    expect(render(template, { a: "y", b: "" })).toBe("A");
    expect(render(template, { a: "", b: "y" })).toBe("");
  });

  it("refuses a hole with no value, rather than sending {{level}} to the model", () => {
    // The whole reason this is strict: the model answers a literal "{{level}}"
    // with something plausible, so nothing downstream ever notices.
    expect(() => render("{{a}} {{b}}", { a: "x" })).toThrow(TemplateError);
    expect(() => render("{{a}} {{b}}", { a: "x" })).toThrow(/asks for b/);
  });

  it("refuses a value the template never mentions, which is a half-finished rename", () => {
    expect(() => render("{{a}}", { a: "x", stale: "y" })).toThrow(/nothing in the template uses stale/);
  });

  it("counts a name inside a branch it does not take as mentioned", () => {
    // The caller cannot know which way the branch goes, so it supplies both
    // sides; requiring the unused one to be absent would be unanswerable.
    expect(render("{{#a}}{{b}}{{/a}}", { a: "", b: "unused here" })).toBe("");
  });

  it("refuses a section that was never closed", () => {
    expect(() => render("{{#a}}oops", { a: "y" })).toThrow(TemplateError);
    expect(() => render("{{#a}}oops", { a: "y" })).toThrow(/never closed/);
  });

  it("lets a value contain braces, because the values are people's own words", () => {
    // A learner's drill answer, their rebuild instructions and a model-written
    // claim all pass through here. Treating "{{" inside one as a tag would turn
    // writing it into a failed grade.
    expect(render("Answer: {{response}}", { response: "use {{ .Values.image }}" })).toBe(
      "Answer: use {{ .Values.image }}",
    );
    expect(render("{{#a}}{{a}}{{/a}}", { a: "{{#each}}" })).toBe("{{#each}}");
  });
});

const PROMPTS_DIR = path.join(process.cwd(), "src", "llm", "prompts");

describe("the prompt files", () => {
  const names = readdirSync(PROMPTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));

  it("are found on disk wherever the process is started from", () => {
    // promptFiles.ts has to guess at its own directory, because neither
    // __dirname nor import.meta.url survives both the bundle and the dev run.
    // If that guess is wrong this is what says so.
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(promptFile(name).length).toBeGreaterThan(0);
    }
  });

  it("uses only the tags the renderer implements", () => {
    for (const name of names) {
      const raw = readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf8");
      const tags = raw.match(/\{\{[^}]*\}\}/g) ?? [];
      for (const tag of tags) {
        expect(tag, `${name}.md has ${tag}`).toMatch(/^\{\{[#^/]?\s*[\w.-]+\s*\}\}$/);
      }
    }
  });

  it("closes every section it opens", () => {
    for (const name of names) {
      const raw = readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf8");
      const opened = (raw.match(/\{\{[#^]\s*([\w.-]+)\s*\}\}/g) ?? []).map((tag) =>
        tag.replace(/[{}#^\s]/g, ""),
      );
      const closed = (raw.match(/\{\{\/\s*([\w.-]+)\s*\}\}/g) ?? []).map((tag) =>
        tag.replace(/[{}/\s]/g, ""),
      );
      expect(opened.slice().sort(), `${name}.md`).toEqual(closed.slice().sort());
    }
  });
});
