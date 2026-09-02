/**
 * Shared Tailwind preset. The palette is deliberately small and low-contrast-safe:
 * a busy screen is a direct tax on concentration (see docs/ux/adhd-learning-guidelines.md, A13).
 *
 * `surface` is a ramp rather than two values, because the map draws its levels as
 * nested cards: the page is `sunken`, a group card sits on `raised`, and the rows
 * inside it are plain white. Three fades a shade apart give the tree a readable
 * shape without adding a second colour to look at. `line` is what actually
 * separates them — a fade that faint needs an edge, or the nesting is invisible.
 *
 * The block below the palette is the same eight colours again under the names
 * react-native-reusables uses. The vendored components in `packages/ui/src/ui`
 * are written against shadcn's semantic tokens (`bg-primary`, `text-muted-foreground`,
 * `border-border`), so naming those here is what themes them — the alternative is
 * editing colours into every component, which is the thing that makes a vendored
 * set impossible to update. One token does not survive the trip: `accent` here has
 * always meant the blue, where shadcn means a faint hover wash by it, so the
 * vendored files say `accent-tint` in the two places that wanted the wash.
 */
const { ink, surface, line, accent, good, warn, bad } = require("./palette");

module.exports = {
  theme: {
    extend: {
      borderRadius: { card: "12px" },
      colors: {
        ink,
        surface,
        line,
        accent,
        good,
        warn,
        bad,

        background: surface.DEFAULT,
        foreground: ink.DEFAULT,
        card: { DEFAULT: surface.DEFAULT, foreground: ink.DEFAULT },
        popover: { DEFAULT: surface.DEFAULT, foreground: ink.DEFAULT },
        primary: { DEFAULT: accent.DEFAULT, foreground: "#ffffff" },
        secondary: { DEFAULT: surface.sunken, foreground: ink.DEFAULT },
        muted: { DEFAULT: surface.sunken, foreground: ink.soft },
        // shadcn's "destructive" means danger, which is what `bad` is. It pointed
        // at the amber while there was no red to point at; nothing in the app
        // renders the variant (Button deliberately does not expose it), so this
        // only ever affected a vendored component nobody had reached for yet.
        destructive: { DEFAULT: bad, foreground: "#ffffff" },
        border: line.DEFAULT,
        input: line.DEFAULT,
        ring: accent.DEFAULT,
      },
    },
  },
};
