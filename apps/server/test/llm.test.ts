import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { LlmProviderId } from "@interestled/schemas";
import { createGeminiProvider } from "../src/llm/gemini";
import { generateJson, stripFence } from "../src/llm/json";
import type { LlmProvider } from "../src/llm/types";
import { GenerationError } from "../src/errors";

const Shape = z.object({ title: z.string(), count: z.number() });

/** A provider that replays canned strings, so no test touches the network. */
function scripted(...replies: string[]): LlmProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    id: LlmProviderId.Gemini,
    model: "test",
    calls,
    complete: async (request) => {
      calls.push(request.prompt);
      return replies.shift() ?? "";
    },
  };
}

describe("stripFence", () => {
  it("unwraps a fenced block, with or without a language tag", () => {
    expect(stripFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripFence('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("leaves bare JSON alone", () => {
    expect(stripFence('  {"a":1} ')).toBe('{"a":1}');
  });
});

describe("generateJson", () => {
  it("returns parsed content on the first try", async () => {
    const provider = scripted('{"title":"x","count":2}');
    await expect(generateJson(provider, { system: "s", prompt: "p", schema: Shape })).resolves.toEqual({
      title: "x",
      count: 2,
    });
    expect(provider.calls).toHaveLength(1);
  });

  it("retries once with the validation errors named", async () => {
    const provider = scripted('{"title":"x"}', '{"title":"x","count":3}');
    const result = await generateJson(provider, { system: "s", prompt: "p", schema: Shape });
    expect(result.count).toBe(3);
    expect(provider.calls[1]).toContain("count");
  });

  it("retries when the reply is not JSON at all", async () => {
    const provider = scripted("Sure! Here you go.", '{"title":"x","count":1}');
    await expect(generateJson(provider, { system: "s", prompt: "p", schema: Shape })).resolves.toBeTruthy();
    expect(provider.calls[1]).toContain("not valid JSON");
  });

  it("gives up after the second failure rather than looping", async () => {
    const provider = scripted("nope", "still nope");
    await expect(generateJson(provider, { system: "s", prompt: "p", schema: Shape })).rejects.toBeInstanceOf(
      GenerationError,
    );
    expect(provider.calls).toHaveLength(2);
  });
});

describe("gemini provider", () => {
  const ok = {
    candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }],
  };

  it("sends the key as a header and returns the joined text", async () => {
    const fetchImpl = vi.fn(
      async (_url: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) =>
        new Response(JSON.stringify(ok), { status: 200 }),
    );
    const provider = createGeminiProvider({
      apiKey: "secret",
      model: "gemini-2.0-flash",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(provider.complete({ system: "s", prompt: "p" })).resolves.toBe('{"a":1}');

    const call = fetchImpl.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call!;
    expect(String(url)).toContain("gemini-2.0-flash:generateContent");
    // The key belongs in a header, never in the query string, where it would
    // land in logs and proxy traces.
    expect(String(url)).not.toContain("secret");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "secret" });
  });

  it("surfaces the provider's own error message", async () => {
    const fetchImpl = vi.fn(
      async (_url: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) =>
        new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 400 }),
    );
    const provider = createGeminiProvider({
      apiKey: "bad",
      model: "m",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(provider.complete({ system: "s", prompt: "p" })).rejects.toThrow("API key not valid");
  });

  it("fails loudly when a response carries no candidate", async () => {
    const fetchImpl = vi.fn(
      async (_url: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );
    const provider = createGeminiProvider({
      apiKey: "k",
      model: "m",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(provider.complete({ system: "s", prompt: "p" })).rejects.toThrow("no usable candidate");
  });
});
