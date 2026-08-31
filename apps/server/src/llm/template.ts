/**
 * The small part of Mustache the prompts actually use: `{{name}}` to fill a
 * hole, `{{#name}}…{{/name}}` to keep a block only when the value is there, and
 * `{{^name}}…{{/name}}` for the other case.
 *
 * Written here rather than pulled in because the rest of Mustache is lambdas,
 * partials, HTML escaping and dotted lookups, none of which belongs in a prompt
 * — and because the useful behaviour is the strictness below, which a template
 * engine will not give you: a hole left unfilled reaches the model as the
 * literal text "{{level}}", and the model answers it with something plausible
 * and wrong rather than failing.
 */

/** Every value is a string; a section keys on whether that string is empty. */
export type TemplateValues = Readonly<Record<string, string>>;

export class TemplateError extends Error {}

/** `{{x}}`, `{{#x}}`, `{{^x}}` and `{{/x}}` alike — every name the template names. */
const MENTION = /\{\{[#^/]?\s*([\w.-]+)\s*\}\}/g;
const SECTION = /\{\{([#^])\s*([\w.-]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
const HOLE = /\{\{\s*([\w.-]+)\s*\}\}/g;
const ANY_TAG = /\{\{/;

/** Every name the template mentions, including inside branches it may not take. */
function mentionedIn(template: string): Set<string> {
  const names = new Set<string>();
  for (const match of template.matchAll(MENTION)) {
    names.add(match[1]!);
  }
  return names;
}

/**
 * Fill `template` from `values`.
 *
 * The template and the call have to name exactly the same things: a name the
 * template asks for and the call does not supply is a hole that would reach the
 * model verbatim, and a value the template never mentions is a line of the
 * prompt somebody renamed and did not finish renaming. Both are silent in
 * production and both are caught here.
 *
 * A name inside a branch that is not taken still counts as mentioned — the
 * caller cannot know in advance which way the branch will go, so it has to
 * supply both sides.
 */
export function render(template: string, values: TemplateValues): string {
  const mentioned = mentionedIn(template);
  const missing = [...mentioned].filter((name) => values[name] === undefined);
  if (missing.length > 0) {
    throw new TemplateError(`the template asks for ${missing.join(", ")}, which was not provided`);
  }
  const unused = Object.keys(values).filter((name) => !mentioned.has(name));
  if (unused.length > 0) {
    throw new TemplateError(`nothing in the template uses ${unused.join(", ")}`);
  }

  const resolveSections = (text: string): string => {
    const next = text.replace(SECTION, (_match, kind: string, name: string, body: string) => {
      const present = values[name]!.trim() !== "";
      return (kind === "#") === present ? body : "";
    });
    // Sections nest, and one pass only ever resolves the innermost pairs.
    return next === text ? next : resolveSections(next);
  };

  const sectioned = resolveSections(template);
  // Checked on the template with its holes struck out, never on the filled
  // result: the values are a learner's answer, their own words on what to
  // change, and model-written claims, so a "{{" inside one is content, not a
  // tag. Scanning the output would turn writing "{{" in a drill answer into a
  // failed grade.
  if (ANY_TAG.test(sectioned.replace(HOLE, ""))) {
    throw new TemplateError("the template has a section in it that is never closed");
  }
  return sectioned.replace(HOLE, (_match, name: string) => values[name]!);
}
