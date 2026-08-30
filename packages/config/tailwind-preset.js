/**
 * Shared Tailwind preset. The palette is deliberately small and low-contrast-safe:
 * a busy screen is a direct tax on concentration (see docs/ux/adhd-learning-guidelines.md, A13).
 */
module.exports = {
  theme: {
    extend: {
      borderRadius: { card: "12px" },
      colors: {
        ink: { DEFAULT: "#111827", soft: "#4b5563", faint: "#9ca3af" },
        surface: { DEFAULT: "#ffffff", sunken: "#f3f4f6" },
        accent: { DEFAULT: "#2563eb", soft: "#dbeafe" },
        good: "#059669",
        warn: "#d97706",
      },
    },
  },
};
