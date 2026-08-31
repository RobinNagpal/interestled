/** One place for cache keys, so an invalidation cannot miss a screen. */
export const keys = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  topics: ["topics"] as const,
  /** Keyed by slug: the screens navigate by slug and never hold a topic id. */
  topic: (slug: string) => ["topic", slug] as const,
  card: (nodeId: string, depth: number | null, variant: string | null) =>
    ["card", nodeId, depth, variant] as const,
  drill: (nodeId: string, kind: string | null) => ["drill", nodeId, kind] as const,
  review: ["review"] as const,
};
