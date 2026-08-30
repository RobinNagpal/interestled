import { describe, expect, it } from "vitest";
import { AtomKind, ReviewGrade } from "@interestled/schemas";
import type { AtomT } from "@interestled/schemas";
import { DAY_MS, dueNow, reschedule } from "../src/scheduling";

const NOW = new Date("2026-03-01T09:00:00Z");

function atom(overrides: Partial<AtomT> = {}): AtomT {
  return {
    id: "a1",
    nodeId: "n1",
    userId: "u1",
    kind: AtomKind.Cloze,
    prompt: "q",
    answer: "a",
    intervalDays: 0,
    ease: 2.5,
    lapses: 0,
    dueAt: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

describe("reschedule", () => {
  it("starts a new item at one day and widens from there", () => {
    const first = reschedule(atom(), ReviewGrade.Recalled, NOW);
    expect(first.intervalDays).toBe(1);
    const second = reschedule(atom({ intervalDays: 1 }), ReviewGrade.Recalled, NOW);
    expect(second.intervalDays).toBe(3);
  });

  it("collapses the interval and lowers ease on a miss", () => {
    const missed = reschedule(atom({ intervalDays: 30 }), ReviewGrade.Missed, NOW);
    expect(missed.intervalDays).toBe(0);
    expect(missed.lapses).toBe(1);
    expect(missed.ease).toBeCloseTo(2.3);
    expect(missed.dueAt.getTime()).toBe(NOW.getTime() + DAY_MS);
  });

  it("caps the interval so nothing disappears for a year", () => {
    const far = reschedule(atom({ intervalDays: 150, ease: 3 }), ReviewGrade.Recalled, NOW);
    expect(far.intervalDays).toBe(180);
  });
});

describe("dueNow", () => {
  it("returns nothing when nothing is due yet", () => {
    const future = new Date(NOW.getTime() + DAY_MS);
    expect(dueNow([atom({ dueAt: future })], NOW)).toEqual([]);
  });

  it("mixes across nodes rather than blocking on one", () => {
    const atoms = [
      atom({ id: "a", nodeId: "n1" }),
      atom({ id: "b", nodeId: "n1" }),
      atom({ id: "c", nodeId: "n2" }),
    ];
    expect(dueNow(atoms, NOW, 3).map((item) => item.nodeId)).toEqual(["n1", "n2", "n1"]);
  });

  it("caps the batch so an absence never becomes a backlog", () => {
    const many = Array.from({ length: 200 }, (_, index) => atom({ id: `a${index}`, nodeId: `n${index}` }));
    expect(dueNow(many, NOW)).toHaveLength(3);
  });
});
