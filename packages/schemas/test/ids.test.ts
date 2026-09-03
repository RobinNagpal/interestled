import { describe, expect, it } from "vitest";
import { Id, newId } from "../src/ids";
import { Email, Password } from "../src/auth";
import {
  CARD_MINUTES_MAX,
  CARD_PROMPT_REVISION,
  CardAngle,
  CardContent,
  MAX_MECHANISM_SECTIONS,
  MECHANISM_SECTION_WORDS,
  MECHANISM_SHARE,
  WORDS_PER_MINUTE,
  cardVariant,
  parseCardVariant,
} from "../src/cards";
import {
  GeneratedThreeLevelMap,
  GeneratedTwoLevelMap,
  flattenLeafChildren,
  flattenThreeLevelMap,
  flattenTwoLevelMap,
} from "../src/nodes";
import {
  ContentFormat,
  ParagraphLength,
  EnglishLevel,
  TechnicalDetail,
  TopicArchetype,
} from "../src/topics";

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
  const section = { heading: "Why it holds", body: "Because of this." };
  const valid = {
    claim: "A claim.",
    mechanism: [section],
    example: { setup: "s", result: "r" },
    misconception: { belief: "b", correction: "c" },
    jargon: [],
  };

  it("accepts a well-formed card", () => {
    expect(CardContent.safeParse(valid).success).toBe(true);
  });

  it("caps a section rather than the count, so length never becomes a wall of text", () => {
    // A ten-minute card is more sections, never longer ones — a wall of text is
    // not made readable by being one of five instead of one of twenty.
    const many = {
      ...valid,
      mechanism: Array.from({ length: MAX_MECHANISM_SECTIONS }, () => section),
    };
    expect(CardContent.safeParse(many).success).toBe(true);
    const tooMany = {
      ...valid,
      mechanism: Array.from({ length: MAX_MECHANISM_SECTIONS + 1 }, () => section),
    };
    expect(CardContent.safeParse(tooMany).success).toBe(false);
    const tooLong = { ...valid, mechanism: [{ ...section, body: "x".repeat(801) }] };
    expect(CardContent.safeParse(tooLong).success).toBe(false);
  });

  it("wants a heading over every paragraph, and a paragraph under every heading", () => {
    // Half a section is worse than none: a heading with nothing under it is a
    // promise the card does not keep, and a paragraph with no heading breaks the
    // run of them the reader is using to navigate.
    expect(CardContent.safeParse({ ...valid, mechanism: [{ heading: "H" }] }).success).toBe(false);
    expect(CardContent.safeParse({ ...valid, mechanism: [{ body: "B" }] }).success).toBe(false);
    // And the shape it replaced, so an old cached row cannot be read as a new one.
    expect(CardContent.safeParse({ ...valid, mechanism: ["Because of this."] }).success).toBe(false);
  });

  it("keeps a heading short enough to be one, rather than a sentence in bold", () => {
    const sentence = { ...section, heading: "x".repeat(81) };
    expect(CardContent.safeParse({ ...valid, mechanism: [sentence] }).success).toBe(false);
  });

  it("holds enough sections for the mechanism's share of the longest card", () => {
    // The read time is honoured by the section count, so the count the prompt
    // asks for at ten minutes must be a count the schema accepts. If this drops
    // below what mechanismSections returns, a card fails validation for doing as
    // it was told — which is the failure this cap exists to make impossible.
    const words = CARD_MINUTES_MAX * WORDS_PER_MINUTE * MECHANISM_SHARE;
    expect(MAX_MECHANISM_SECTIONS).toBeGreaterThanOrEqual(
      Math.round(words / MECHANISM_SECTION_WORDS),
    );
  });

  it("keys a cached card by everything that changes how it is written", () => {
    // Two cards asked for differently must never share a row, and two asked for
    // the same way must never be written twice.
    const base = {
      depth: 3,
      minutes: 5,
      englishLevel: EnglishLevel.Medium,
      technicalDetail: TechnicalDetail.Medium,
      format: ContentFormat.Prose,
      paragraphLength: ParagraphLength.Medium,
      angle: CardAngle.Base,
      instructions: "",
    };
    expect(cardVariant(base)).toBe(cardVariant({ ...base }));
    // Not the instructions: free text cannot be a key without being hashed, and
    // the row stores the text instead. A card at its key with other
    // instructions is answered as it is, and the panel says so.
    expect(cardVariant({ ...base, instructions: "Compare it with Postgres" })).toBe(
      cardVariant(base),
    );
    expect(cardVariant({ ...base, minutes: 10 })).not.toBe(cardVariant(base));
    // Paragraph length is the newest of them and the easiest to forget: it
    // changes the writing without changing the depth, the register or the length.
    expect(cardVariant({ ...base, paragraphLength: ParagraphLength.Long })).not.toBe(
      cardVariant(base),
    );
    // Both axes, separately: they are two questions, so a card asked the same
    // English at a different level of detail is a different card and must not
    // be answered from the other one's row.
    expect(cardVariant({ ...base, englishLevel: EnglishLevel.Simple })).not.toBe(cardVariant(base));
    expect(cardVariant({ ...base, technicalDetail: TechnicalDetail.High })).not.toBe(
      cardVariant(base),
    );
    expect(cardVariant({ ...base, format: ContentFormat.ReferenceNotes })).not.toBe(
      cardVariant(base),
    );
    expect(cardVariant({ ...base, angle: CardAngle.WhyItMatters })).not.toBe(cardVariant(base));
    // And the prompt generation, so rewriting card.md is not a change that
    // reaches only the nodes nobody has opened yet.
    expect(cardVariant(base)).toContain(`r${CARD_PROMPT_REVISION}`);
  });

  it("reads a cached row's key back into the settings it was written to", () => {
    // What lets a node answer with the card it has when nothing is cached at
    // the settings asked for: the row has to be able to say what it is.
    const settings = {
      depth: 4,
      minutes: 7,
      englishLevel: EnglishLevel.Simple,
      technicalDetail: TechnicalDetail.High,
      format: ContentFormat.ReferenceNotes,
      paragraphLength: ParagraphLength.Long,
      angle: CardAngle.WhyItMatters,
      instructions: "Use an example from banking",
    };
    expect(parseCardVariant(cardVariant(settings), 4, settings.instructions)).toEqual(settings);
  });

  it("refuses a row from an earlier prompt revision, so the bump still retires it", () => {
    const stale = cardVariant({
      depth: 2,
      minutes: 3,
      englishLevel: EnglishLevel.Medium,
      technicalDetail: TechnicalDetail.Medium,
      format: ContentFormat.Prose,
      paragraphLength: ParagraphLength.Medium,
      angle: CardAngle.Base,
      instructions: "",
    }).replace(`r${CARD_PROMPT_REVISION}`, `r${CARD_PROMPT_REVISION - 1}`);
    expect(parseCardVariant(stale, 2, "")).toBeNull();
    expect(parseCardVariant("base", 2, "")).toBeNull();
    expect(parseCardVariant(`r${CARD_PROMPT_REVISION}|base|3|loud|medium|prose|medium`, 2, "")).toBeNull();
  });

  it("takes a card with no example and no misconception", () => {
    // A node that is itself one case has no second case to instantiate it with,
    // and a descriptive node has no wrong belief to correct. Demanding both
    // anyway is what put the node back on the screen under a heading promising
    // something new — the padding this optionality exists to stop.
    const { example: _e, misconception: _m, ...bare } = valid;
    expect(CardContent.safeParse(bare).success).toBe(true);
  });

  it("still requires the claim and the mechanism, which are the card", () => {
    const { claim: _c, ...noClaim } = valid;
    expect(CardContent.safeParse(noClaim).success).toBe(false);
    expect(CardContent.safeParse({ ...valid, mechanism: [] }).success).toBe(false);
  });

  it("refuses a half-written optional slot rather than dropping the half", () => {
    // Optional is the whole object or none of it: a belief with no correction
    // is a wrong statement on the screen with nothing answering it.
    const halfway = { ...valid, misconception: { belief: "b" } };
    expect(CardContent.safeParse(halfway).success).toBe(false);
  });
});

describe("the generated map shapes", () => {
  const leaf = (key: string) => ({
    key,
    title: "T",
    claim: "c",
    minutes: 3,
    capability: "do it",
    prerequisiteKeys: [],
  });
  const section = (key: string, leafKeys: string[]) => ({
    key,
    title: "Group",
    claim: "c",
    capability: "do the group",
    nodes: leafKeys.map(leaf),
  });
  const twoLevel = (sections: ReturnType<typeof section>[]) => ({
    archetype: TopicArchetype.Tool,
    sections,
  });

  it("accepts a two-level map with unique keys", () => {
    const map = twoLevel([
      section("s1", ["a", "b"]),
      section("s2", ["c", "d"]),
      section("s3", ["e", "f"]),
    ]);
    expect(GeneratedTwoLevelMap.safeParse(map).success).toBe(true);
  });

  it("rejects duplicate keys, which would map two nodes onto one row", () => {
    // Across groups, not only inside one: keys become ids for the whole map.
    const map = twoLevel([
      section("s1", ["a", "b"]),
      section("s2", ["a", "d"]),
      section("s3", ["e", "f"]),
    ]);
    expect(GeneratedTwoLevelMap.safeParse(map).success).toBe(false);
  });

  it("rejects a group key that repeats one of its own nodes", () => {
    const map = twoLevel([
      section("s1", ["s2", "b"]),
      section("s2", ["c", "d"]),
      section("s3", ["e", "f"]),
    ]);
    expect(GeneratedTwoLevelMap.safeParse(map).success).toBe(false);
  });

  it("rejects a map too small to be worth showing", () => {
    expect(GeneratedTwoLevelMap.safeParse(twoLevel([section("s1", ["a", "b"])])).success).toBe(false);
  });

  it("flattens a two-level map to rows, groups before their nodes", () => {
    const flat = flattenTwoLevelMap(
      twoLevel([section("s1", ["a", "b"]), section("s2", ["c", "d"]), section("s3", ["e", "f"])]),
    );
    expect(flat.nodes.map((node) => node.key)).toEqual([
      "s1", "a", "b", "s2", "c", "d", "s3", "e", "f",
    ]);
    expect(flat.nodes[0]).toMatchObject({ parentKey: null, depth: 1, minutes: 0 });
    expect(flat.nodes[1]).toMatchObject({ parentKey: "s1", depth: 2, minutes: 3 });
  });

  it("gives a group no minutes of its own, because it is a heading", () => {
    const flat = flattenTwoLevelMap(
      twoLevel([section("s1", ["a", "b"]), section("s2", ["c", "d"]), section("s3", ["e", "f"])]),
    );
    const groups = flat.nodes.filter((node) => node.depth === 1);
    expect(groups.every((node) => node.minutes === 0)).toBe(true);
  });

  it("flattens a three-level map to three depths", () => {
    // Three areas, because a map's top level is held to the same count at both
    // level counts — the bounds here are the settings the learner is offered,
    // so a shape they can choose is never one the parse refuses.
    const area = (key: string, sections: ReturnType<typeof section>[]) => ({
      key,
      title: "Area",
      claim: "c",
      capability: "do the area",
      sections,
    });
    const map = {
      archetype: TopicArchetype.Tool,
      areas: [
        area("area1", [section("s1", ["a", "b"]), section("s2", ["c", "d"])]),
        area("area2", [section("s3", ["e", "f"]), section("s4", ["g", "h"])]),
        area("area3", [section("s5", ["i", "j"]), section("s6", ["k", "l"])]),
      ],
    };
    expect(GeneratedThreeLevelMap.safeParse(map).success).toBe(true);
    const flat = flattenThreeLevelMap(map);
    expect(flat.nodes.find((node) => node.key === "area1")).toMatchObject({ parentKey: null, depth: 1 });
    expect(flat.nodes.find((node) => node.key === "s1")).toMatchObject({ parentKey: "area1", depth: 2 });
    expect(flat.nodes.find((node) => node.key === "a")).toMatchObject({ parentKey: "s1", depth: 3 });
  });

  it("attaches regenerated children under the branch that asked for them", () => {
    const flat = flattenLeafChildren({ nodes: [leaf("a"), leaf("b")] }, "s1", 3);
    expect(flat.every((node) => node.parentKey === "s1" && node.depth === 3)).toBe(true);
  });
});
