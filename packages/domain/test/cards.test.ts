import { describe, expect, it } from "vitest";
import {
  CardAngle,
  CardSettings,
  ContentFormat,
  EnglishLevel,
  ParagraphLength,
  TechnicalDetail,
} from "@interestled/schemas";
import type { CardSettingsT } from "@interestled/schemas";
import { sameCardSettings } from "../src/cards";

const settings: CardSettingsT = {
  depth: 2,
  minutes: 3,
  englishLevel: EnglishLevel.Medium,
  technicalDetail: TechnicalDetail.Medium,
  format: ContentFormat.Prose,
  paragraphLength: ParagraphLength.Medium,
  angle: CardAngle.Base,
  instructions: "",
};

/** One of these per field, which is what the count below is checking. */
const moved: CardSettingsT[] = [
  { ...settings, depth: 3 },
  { ...settings, minutes: 4 },
  { ...settings, englishLevel: EnglishLevel.Simple },
  { ...settings, technicalDetail: TechnicalDetail.High },
  { ...settings, format: ContentFormat.ReferenceNotes },
  { ...settings, paragraphLength: ParagraphLength.Long },
  { ...settings, angle: CardAngle.MoreConcrete },
  { ...settings, instructions: "Compare it with Postgres" },
];

describe("sameCardSettings", () => {
  it("is true for the same settings", () => {
    expect(sameCardSettings(settings, { ...settings })).toBe(true);
  });

  it("sees every field a card is written from move", () => {
    // The panel's whole state hangs off this answer, so a field added to
    // CardSettings and not to the comparison would leave a chip that moves and
    // a button that stays spent.
    expect(moved).toHaveLength(Object.keys(CardSettings.shape).length);
    for (const settingsMoved of moved) {
      expect(sameCardSettings(settings, settingsMoved)).toBe(false);
    }
  });
});
