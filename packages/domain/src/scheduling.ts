import { ReviewGrade } from "@interestled/schemas";
import type { AtomT } from "@interestled/schemas";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Deliberately small: three items is a session someone will actually start. */
export const REVIEW_BATCH = 3;

export interface Schedule {
  intervalDays: number;
  ease: number;
  lapses: number;
  dueAt: Date;
}

/**
 * Widening intervals, collapsed by failure. Simpler than SM-2 on purpose —
 * the scheduler's job here is to keep items coming back, and the failure path
 * matters far more than the exact spacing of the successes.
 */
export function reschedule(atom: AtomT, grade: ReviewGrade, now: Date): Schedule {
  if (grade === ReviewGrade.Missed) {
    return {
      intervalDays: 0,
      ease: Math.max(1.3, atom.ease - 0.2),
      lapses: atom.lapses + 1,
      dueAt: new Date(now.getTime() + DAY_MS),
    };
  }
  const next = atom.intervalDays === 0 ? 1 : Math.round(atom.intervalDays * atom.ease);
  const intervalDays = Math.min(next, 180);
  return {
    intervalDays,
    ease: Math.min(3, atom.ease + 0.05),
    lapses: atom.lapses,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
  };
}

/**
 * The due queue, mixed across nodes rather than blocked on one, and capped.
 * An absence must never produce a backlog: 200 overdue items is a wall, so
 * only the batch is ever shown and the rest simply stay due (W20).
 */
export function dueNow(atoms: readonly AtomT[], now: Date, limit: number = REVIEW_BATCH): AtomT[] {
  const due = atoms.filter((atom) => atom.dueAt.getTime() <= now.getTime());
  const byNode = new Map<string, AtomT[]>();
  for (const atom of due) {
    byNode.set(atom.nodeId, [...(byNode.get(atom.nodeId) ?? []), atom]);
  }
  // Round-robin over nodes so consecutive items come from different places.
  const queues = [...byNode.values()].map((list) =>
    [...list].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()),
  );
  const mixed: AtomT[] = [];
  let index = 0;
  while (mixed.length < limit && queues.some((queue) => queue.length > 0)) {
    const queue = queues[index % queues.length];
    const next = queue?.shift();
    if (next !== undefined) {
      mixed.push(next);
    }
    index += 1;
  }
  return mixed;
}
