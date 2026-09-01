import type { CardSettingsT } from "@interestled/schemas";

/** One place for cache keys, so an invalidation cannot miss a screen. */
export const keys = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  topics: ["topics"] as const,
  /** Keyed by slug: the screens navigate by slug and never hold a topic id. */
  topic: (slug: string) => ["topic", slug] as const,
  /** The default writing settings a topic falls back to. Constant, so fetched once. */
  topicDefaults: ["topic-defaults"] as const,
  /** Every card, at every depth and variant — what changing a topic's settings drops. */
  cards: ["card"] as const,
  /**
   * Keyed by the settings the card was asked for, so two sets of controls never
   * share an entry. Written out field by field rather than by spreading the
   * object: a key built from `Object.values` would change meaning the day a
   * field is added, and every cached card would quietly become a miss.
   */
  card: (nodeId: string, settings: Partial<CardSettingsT>) =>
    [
      "card",
      nodeId,
      settings.depth ?? null,
      settings.minutes ?? null,
      settings.englishLevel ?? null,
      settings.technicalDetail ?? null,
      settings.format ?? null,
      settings.angle ?? null,
    ] as const,
  drill: (nodeId: string, kind: string | null) => ["drill", nodeId, kind] as const,
  review: ["review"] as const,
};
