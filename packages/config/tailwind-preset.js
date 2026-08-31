/**
 * Shared Tailwind preset. The palette is deliberately small and low-contrast-safe:
 * a busy screen is a direct tax on concentration (see docs/ux/adhd-learning-guidelines.md, A13).
 *
 * `surface` is a ramp rather than two values, because the map draws its levels as
 * nested cards: the page is `sunken`, a group card sits on `raised`, and the rows
 * inside it are plain white. Three fades a shade apart give the tree a readable
 * shape without adding a second colour to look at. `line` is what actually
 * separates them — a fade that faint needs an edge, or the nesting is invisible.
 */
module.exports = {
  theme: {
    extend: {
      borderRadius: { card: "12px" },
      colors: {
        ink: { DEFAULT: "#111827", soft: "#4b5563", faint: "#9ca3af" },
        surface: { DEFAULT: "#ffffff", raised: "#fafbfc", sunken: "#f3f4f6" },
        line: { DEFAULT: "#e5e7eb", strong: "#d1d5db" },
        accent: { DEFAULT: "#2563eb", soft: "#dbeafe", tint: "#eef4ff" },
        good: "#059669",
        warn: "#d97706",
      },
    },
  },
};
