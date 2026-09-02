import { describe, expect, it } from "vitest";
import { keys } from "../src/keys";
import { CONTENT_STALE_MS, QUERY_GC_MS, createAppQueryClient } from "../src/queryClient";

/**
 * The cache policy is what keeps the phone and the website showing the same
 * map, so it is pinned here: learner state is refetched on every mount and
 * every return to the foreground, and generated content is not.
 */
describe("createAppQueryClient", () => {
  const client = createAppQueryClient();

  it("never trusts learner state past the moment it arrived", () => {
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(0);
    expect(defaults?.refetchOnMount).toBe(true);
    expect(defaults?.refetchOnWindowFocus).toBe(true);
    expect(defaults?.refetchOnReconnect).toBe(true);
    expect(defaults?.gcTime).toBe(QUERY_GC_MS);
    // No override for the map, the topics list, the review batch or the profile.
    expect(client.getQueryDefaults(keys.topic("x"))).toEqual({});
    expect(client.getQueryDefaults(keys.topics)).toEqual({});
    expect(client.getQueryDefaults(keys.review)).toEqual({});
    expect(client.getQueryDefaults(keys.profile)).toEqual({});
    // Nor for what was asked on a card: it is learner state, not generated
    // content, and the phone must show the question the website just asked.
    expect(client.getQueryDefaults(keys.questions("node"))).toEqual({});
  });

  it("leaves a card alone while it is being read", () => {
    const card = client.getQueryDefaults(keys.card("node", { depth: 2 }));
    expect(card.staleTime).toBe(CONTENT_STALE_MS);
    expect(card.refetchOnWindowFocus).toBe(false);
  });

  it("never changes a drill under a half-typed answer", () => {
    const drill = client.getQueryDefaults(keys.drill("node", null));
    expect(drill.staleTime).toBe(Infinity);
    expect(drill.refetchOnWindowFocus).toBe(false);
  });
});
