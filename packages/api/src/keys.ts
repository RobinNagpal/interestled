/** One place for cache keys, so an invalidation cannot miss a screen. */
export const keys = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  topics: ["topics"] as const,
  topic: (id: string) => ["topic", id] as const,
  card: (nodeId: string, depth: number | null, variant: string | null) =>
    ["card", nodeId, depth, variant] as const,
  drill: (nodeId: string, kind: string | null) => ["drill", nodeId, kind] as const,
  review: ["review"] as const,
};
