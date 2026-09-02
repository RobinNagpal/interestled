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
  /**
   * Every card, at every depth and variant — what changing a topic's settings
   * marks stale, so the next open of each learns the settings have moved.
   */
  cards: ["card"] as const,
  /** Every card of one node, at every setting: what saving its instructions touches. */
  cardsOf: (nodeId: string) => ["card", nodeId] as const,
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
      settings.paragraphLength ?? null,
      settings.angle ?? null,
    ] as const,
  /** Every drill — the prefix the cache policy for generated content hangs off. */
  drills: ["drill"] as const,
  drill: (nodeId: string, kind: string | null) => ["drill", nodeId, kind] as const,
  /**
   * What was asked on a card. Learner state, not generated content — it is
   * whatever the last device to ask left — so it takes the default policy and
   * is asked for again on every open.
   */
  questions: (nodeId: string) => ["questions", nodeId] as const,
  /** Every recording of one node, at every setting: the prefix a rewrite touches. */
  audioOf: (nodeId: string) => ["audio", nodeId] as const,
  /**
   * The recording of one card, if it has one. Learner state rather than
   * generated content, and deliberately so: what it carries is a signed link
   * with an hour on it, so it has to be asked for again on every mount and
   * every return to the foreground. The generated half — the script and the
   * audio — is in the bucket, and this key never holds it.
   *
   * Keyed by the settings the card was written to, the same way `card` is and
   * for the same reason: a node has a recording per card, and one entry for the
   * node would hand the reader the recording of a card they are not looking at.
   */
  audio: (nodeId: string, settings: CardSettingsT) =>
    [
      "audio",
      nodeId,
      settings.depth,
      settings.minutes,
      settings.englishLevel,
      settings.technicalDetail,
      settings.format,
      settings.paragraphLength,
      settings.angle,
    ] as const,
  review: ["review"] as const,
};
