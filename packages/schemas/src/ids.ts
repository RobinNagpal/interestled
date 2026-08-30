import { z } from "zod";

/** Every id is a client-generatable opaque string, so an offline row still has one. */
export const Id = z.string().min(1).max(64);

export type IdT = z.infer<typeof Id>;

/**
 * Sortable, collision-resistant id: millisecond timestamp + 80 random bits.
 * Sorting by id therefore sorts by creation time, which saves an index in a
 * few list queries.
 */
export function newId(random: () => number = Math.random): IdT {
  const time = Date.now().toString(36).padStart(9, "0");
  let suffix = "";
  for (let index = 0; index < 16; index += 1) {
    suffix += Math.floor(random() * 36).toString(36);
  }
  return `${time}${suffix}`;
}
