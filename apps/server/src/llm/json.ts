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

/**
 * One structured generation. On a schema failure it retries once with the
 * validation errors appended — a single targeted retry fixes most of them, and
 * a loop would turn one slow call into an unbounded one.
 */
export async function generateJson<T>(
  provider: LlmProvider,
  options: GenerateJsonOptions<T>,
): Promise<T> {
  let prompt = options.prompt;
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
    prompt = `${options.prompt}\n\nYour previous reply did not match the required shape (${problems}). Fix exactly those fields and reply with JSON only.`;
  }
  throw new GenerationError("The model could not produce content in the required shape");
}
