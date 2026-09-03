import { describe, expect, it } from "vitest";
import { MapDepth, MapLevels, MapShape, MinutesPerDay, StudyDays } from "@interestled/schemas";
import type { MapShapeT } from "@interestled/schemas";
import { mapShapeRows, mapShapeSummary } from "../src/copy";

const shape: MapShapeT = {
  levels: MapLevels.Two,
  mainHeadings: 5,
  subHeadings: 4,
  minutesPerDay: MinutesPerDay.Twenty,
  days: StudyDays.Fortnight,
  depth: MapDepth.Working,
};

/**
 * The panel on the edit screen claims to say what a map was built to, and it is
 * the only place a learner can read that. A setting the shape gains and the rows
 * do not is that claim quietly becoming false, which is exactly the lying map
 * the product rules forbid — so the count is asserted rather than assumed.
 */
describe("mapShapeRows", () => {
  it("has a row for every setting the shape holds", () => {
    expect(mapShapeRows(shape)).toHaveLength(Object.keys(MapShape.shape).length);
  });

  it("names the values in the same words as the chips that set them", () => {
    expect(mapShapeRows(shape)).toEqual([
      {
        label: "Levels",
        value: "Two",
        body: "Headings, and the nodes under them. Right for most subjects.",
      },
      { label: "Main headings", value: "5" },
      { label: "Nodes under each", value: "4" },
      { label: "A sitting", value: "20 min" },
      { label: "Over", value: "2 weeks" },
      {
        label: "How far in",
        value: "Working",
        body: "Enough to use it for the everyday cases.",
      },
    ]);
  });

  it("names the second count for what it counts at this level count", () => {
    // The same words the chip that sets it uses: at three levels that count is
    // headings, and the nodes hang under those.
    const rows = mapShapeRows({ ...shape, levels: MapLevels.Three });
    expect(rows[2]).toEqual({ label: "Sub-headings under each", value: "4" });
  });
});

describe("mapShapeSummary", () => {
  it("says the shape in one line", () => {
    expect(mapShapeSummary(shape)).toBe(
      "2 levels · 5 headings, 4 under each · 20 min a day for 2 weeks · working",
    );
  });

  it("says how many levels, because the counts mean different things at each", () => {
    expect(mapShapeSummary({ ...shape, levels: MapLevels.Three })).toContain("3 levels");
  });

  it("calls one day one sitting, as the instruction line does", () => {
    expect(mapShapeSummary({ ...shape, days: StudyDays.One })).toContain("20 min in one sitting");
  });
});
