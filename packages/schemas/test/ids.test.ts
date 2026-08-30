import { describe, expect, it } from "vitest";
import { Id, newId } from "../src/ids";
import { Email, Password } from "../src/auth";
import { CardContent } from "../src/cards";

describe("newId", () => {
  it("produces ids the schema accepts", () => {
    expect(() => Id.parse(newId())).not.toThrow();
  });

  it("sorts by creation time, so ordering by id orders by age", () => {
    const first = newId(() => 0);
    const second = newId(() => 0.99);
    // Same millisecond: the random suffix breaks the tie without reordering
    // the timestamp prefix.
    expect(first.slice(0, 9)).toBe(second.slice(0, 9));
    expect(first < second).toBe(true);
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
