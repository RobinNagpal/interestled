import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `cn` from react-native-reusables, taught our one custom radius.
 *
 * The merge is the point: a vendored component states a default class and the
 * call site overrides it, and only tailwind-merge knows that `rounded-md` and
 * `rounded-card` are the same slot. It cannot know that about a radius Tailwind
 * did not ship, so `card` is added to its border-radius theme — registering the
 * value rather than the one class also covers `rounded-t-card`, which the sheet
 * uses. Without it both classes survive into the output and which one wins is
 * whichever the stylesheet emitted last, which is not a thing any call site can
 * see.
 */
const twMerge = extendTailwindMerge({ extend: { theme: { borderRadius: ["card"] } } });

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
