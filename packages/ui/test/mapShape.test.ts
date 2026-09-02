import { describe, expect, it } from "vitest";
import { MapDepth, MapShape, MinutesPerDay, StudyDays } from "@interestled/schemas";
import type { MapShapeT } from "@interestled/schemas";
import { mapShapeRows, mapShapeSummary } from "../src/copy";

const shape: MapShapeT = {
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
      { label: "Main headings", value: "5" },
      { label: "Sub-headings under each", value: "4" },
      { label: "A sitting", value: "20 min" },
      { label: "Over", value: "2 weeks" },
      {
        label: "How far in",
        value: "Working",
        body: "Enough to use it for the everyday cases.",
      },
    ]);
  });
});

describe("mapShapeSummary", () => {
  it("says the shape in one line", () => {
    expect(mapShapeSummary(shape)).toBe(
      "5 headings, 4 under each · 20 min a day for 2 weeks · working",
    );
  });

  it("calls one day one sitting, as the instruction line does", () => {
    expect(mapShapeSummary({ ...shape, days: StudyDays.One })).toContain("20 min in one sitting");
  });
});
