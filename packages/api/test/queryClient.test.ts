import { describe, expect, it } from "vitest";
import { keys } from "../src/keys";
import {
  CONTENT_STALE_MS,
  QUERY_GC_MS,
  createAppQueryClient,
  shouldPersistQuery,
} from "../src/queryClient";
import type { Query } from "@tanstack/react-query";
import {
  CardAngle,
  ContentFormat,
  EnglishLevel,
  ParagraphLength,
  TechnicalDetail,
} from "@interestled/schemas";

/** What a plain open of a three-minute node is written to. */
const settings = {
  depth: 2,
  minutes: 3,
  englishLevel: EnglishLevel.Medium,
  technicalDetail: TechnicalDetail.Medium,
  format: ContentFormat.Prose,
  paragraphLength: ParagraphLength.Medium,
  angle: CardAngle.Base,
  instructions: "",
};

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

  it("asks again for a recording's link, which is signed and expires", () => {
    // Not generated content, despite what it points at: what this key holds is
    // a URL with an hour on it, and the audio itself is in the bucket.
    expect(client.getQueryDefaults(keys.audio("node", settings))).toEqual({});
  });
});

describe("shouldPersistQuery", () => {
  /** A settled query, which is the only kind the default would write anyway. */
  function settled(queryKey: readonly unknown[]): Query {
    return { queryKey, state: { status: "success" } } as unknown as Query;
  }

  it("keeps the signed link off disk, so a launch never paints a dead one", () => {
    expect(shouldPersistQuery(settled(keys.audio("node", settings)))).toBe(false);
  });

  it("writes everything else, which is what opening on the app rather than a spinner needs", () => {
    expect(shouldPersistQuery(settled(keys.topics))).toBe(true);
    expect(shouldPersistQuery(settled(keys.topic("kubernetes")))).toBe(true);
    expect(shouldPersistQuery(settled(keys.card("node", { depth: 2 })))).toBe(true);
  });

  it("still refuses what the default refuses", () => {
    const pending = { queryKey: keys.topics, state: { status: "pending" } } as unknown as Query;
    expect(shouldPersistQuery(pending)).toBe(false);
  });
});
