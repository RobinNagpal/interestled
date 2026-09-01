import { GenerationError } from "../errors";
import type { LlmProvider, SchemaOf } from "./types";

/**
 * Models sometimes wrap JSON in a fenced block even when asked not to. Stripping
 * it is cheaper than a retry, so it happens before the parse rather than after.
 */
export function stripFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

export interface GenerateJsonOptions<T> {
  system: string;
  prompt: string;
  schema: SchemaOf<T>;
  temperature?: number;
  maxOutputTokens?: number;
}

/** How much of a rejected reply is worth keeping in the log to recognise it by. */
const SAMPLE_LENGTH = 400;

/**
 * One structured generation. On a schema failure it retries once with the
 * validation errors appended — a single targeted retry fixes most of them, and
 * a loop would turn one slow call into an unbounded one.
 *
 * Both attempts are logged when the second one fails. The learner gets a
 * sentence they can act on ("try again"), which is all a 502 body should be, but
 * that sentence is also the only thing anybody had when this failed in
 * production — and "the shape was wrong" without saying which field, or whether
 * the reply was truncated rather than wrong, is not something you can fix. What
 * goes to the log is why each attempt was rejected and the head of what came
 * back; the prompts are not logged, because they carry what the learner wrote.
 */
export async function generateJson<T>(
  provider: LlmProvider,
  options: GenerateJsonOptions<T>,
): Promise<T> {
  let prompt = options.prompt;
  const rejected: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await provider.complete({
      system: options.system,
      prompt,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
    });
    let value: unknown;
    try {
      value = JSON.parse(stripFence(raw));
    } catch {
      // Truncation lands here rather than on the schema: asking for
      // application/json gets valid JSON unless the reply was cut off, so "not
      // valid JSON" twice running usually means maxOutputTokens, not a model
      // that cannot follow instructions. The length says which.
      rejected.push(`attempt ${attempt + 1}: not JSON, ${raw.length} chars: ${head(raw)}`);
      prompt = `${options.prompt}\n\nYour previous reply was not valid JSON. Reply with JSON only.`;
      continue;
    }
    const parsed = options.schema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    rejected.push(`attempt ${attempt + 1}: ${problems}`);
    prompt = `${options.prompt}\n\nYour previous reply did not match the required shape (${problems}). Fix exactly those fields and reply with JSON only.`;
  }
  console.error(`generateJson gave up — ${rejected.join(" | ")}`);
  throw new GenerationError("The model could not produce content in the required shape");
}

function head(text: string): string {
  return text.length <= SAMPLE_LENGTH ? text : `${text.slice(0, SAMPLE_LENGTH)}…`;
}
