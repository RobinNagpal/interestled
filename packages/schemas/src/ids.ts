import { z } from "zod";

/** Every id is a client-generatable opaque string, so an offline row still has one. */
export const Id = z.string().min(1).max(64);

export type IdT = z.infer<typeof Id>;

/**
 * Sortable, collision-resistant id: millisecond timestamp + 80 random bits.
 * Sorting by id therefore sorts by creation time, which saves an index in a
 * few list queries.
 *
 * `random` and `now` are both injectable so a test can pin them. The clock
 * matters as much as the randomness: a test that generates two ids and expects
 * one timestamp is asserting something only true if the millisecond does not
 * tick between the calls, which is a coin flip on a loaded CI runner.
 */
export function newId(random: () => number = Math.random, now: () => number = Date.now): IdT {
  const time = now().toString(36).padStart(9, "0");
  let suffix = "";
  for (let index = 0; index < 16; index += 1) {
    suffix += Math.floor(random() * 36).toString(36);
  }
  return `${time}${suffix}`;
}
