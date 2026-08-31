import { describe, expect, it } from "vitest";
import { Id, newId } from "../src/ids";
import { Email, Password } from "../src/auth";
import { CardContent } from "../src/cards";
import { GeneratedMap } from "../src/nodes";
import { TopicArchetype } from "../src/topics";

describe("newId", () => {
  it("produces ids the schema accepts", () => {
    expect(() => Id.parse(newId())).not.toThrow();
  });

  it("sorts by creation time, so ordering by id orders by age", () => {
    // The clock is pinned, not merely assumed to be still: reading Date.now()
    // twice made this fail whenever the millisecond ticked between the calls.
    const at = (): number => 1_700_000_000_000;
    const first = newId(() => 0, at);
    const second = newId(() => 0.99, at);
    // Same millisecond: the random suffix breaks the tie without reordering
    // the timestamp prefix.
    expect(first.slice(0, 9)).toBe(second.slice(0, 9));
    expect(first < second).toBe(true);
  });

  it("orders across milliseconds by the timestamp, whatever the suffix", () => {
    const earlier = newId(() => 0.99, () => 1_700_000_000_000);
    const later = newId(() => 0, () => 1_700_000_000_001);
    expect(earlier < later).toBe(true);
  });

  it("does not collide across many draws", () => {
    const ids = new Set(Array.from({ length: 5000 }, () => newId()));
    expect(ids.size).toBe(5000);
  });
});

describe("Email", () => {
  it("trims and lowercases, so one address cannot become two accounts", () => {
    expect(Email.parse("  Robin@Example.COM ")).toBe("robin@example.com");
  });

  it("rejects something that is not an address", () => {
    expect(Email.safeParse("robin").success).toBe(false);
  });
});

describe("Password", () => {
  it("asks for length rather than composition", () => {
    expect(Password.safeParse("correct horse battery").success).toBe(true);
    expect(Password.safeParse("Ab1!x").success).toBe(false);
  });
});

describe("CardContent", () => {
  const valid = {
    claim: "A claim.",
    mechanism: ["Because of this."],
    example: { setup: "s", result: "r" },
    misconception: { belief: "b", correction: "c" },
    jargon: [],
  };

  it("accepts a well-formed card", () => {
    expect(CardContent.safeParse(valid).success).toBe(true);
  });

  it("caps the mechanism, so a card cannot become a wall of text", () => {
    const long = { ...valid, mechanism: Array.from({ length: 6 }, () => "line") };
    expect(CardContent.safeParse(long).success).toBe(false);
  });

  it("requires the misconception — the slot exists to force it to be written", () => {
    const { misconception: _omitted, ...without } = valid;
    expect(CardContent.safeParse(without).success).toBe(false);
  });
});

describe("GeneratedMap", () => {
  const node = (key: string) => ({
    key,
    title: "T",
    claim: "c",
    minutes: 3,
    capability: "do it",
    prerequisiteKeys: [],
  });
  const map = (keys: string[]) => ({
    archetype: TopicArchetype.Tool,
    nodes: keys.map(node),
  });

  it("accepts a map with unique keys", () => {
    expect(GeneratedMap.safeParse(map(["a", "b", "c", "d", "e", "f"])).success).toBe(true);
  });

  it("rejects duplicate keys, which would map two nodes onto one row", () => {
    expect(GeneratedMap.safeParse(map(["a", "b", "c", "d", "e", "a"])).success).toBe(false);
  });

  it("rejects a map too small to be worth showing", () => {
    expect(GeneratedMap.safeParse(map(["a", "b"])).success).toBe(false);
  });
});
