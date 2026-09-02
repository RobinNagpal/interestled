/**
 * The colours, in one place.
 *
 * Screens name these through Tailwind classes — `bg-good`, `text-ink-soft` —
 * and never as values, which is what the preset beside this file is for. The
 * exception is a third-party component that takes a colour as a *prop* rather
 * than a class: a slider's track has nowhere to put a class name. Those import
 * from here, so moving a colour moves it everywhere rather than leaving one
 * control on the old one with nothing failing to compile.
 *
 * Plain CommonJS because tailwind.config.js has to require it.
 */
const ink = { DEFAULT: "#111827", soft: "#4b5563", faint: "#9ca3af" };
const surface = { DEFAULT: "#ffffff", raised: "#fafbfc", sunken: "#f3f4f6" };
const line = { DEFAULT: "#e5e7eb", strong: "#d1d5db" };
const accent = { DEFAULT: "#2563eb", soft: "#dbeafe", tint: "#eef4ff" };
/** Earned, and a recording ready to play. */
const good = "#059669";
/** Caution: a node that needs another look. Not a failure. */
const warn = "#d97706";
/** Something failed and will not fix itself. */
const bad = "#dc2626";

module.exports = { ink, surface, line, accent, good, warn, bad };
