import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { keys } from "./keys";

/**
 * How long an unused entry is kept, in memory and on disk. The persisted cache
 * must not outlive this — `maxAge` on the persister reads it — or a restore
 * brings back rows the client would then immediately garbage-collect.
 */
export const QUERY_GC_MS = 24 * 60 * 60 * 1000;

/**
 * A generated card is stable for this long once read: revisiting one is a
 * cache hit, a depth button that costs a wait is one nobody presses. Past it,
 * the next screen to mount asks again, which is how a card written again on the
 * website reaches the phone.
 */
export const CONTENT_STALE_MS = 5 * 60 * 1000;

/**
 * How often the app asks whether a recording it started has finished.
 *
 * Making one takes half a minute to a couple of minutes, so this is not a
 * progress bar — it is how long the button can be wrong for. Three seconds is
 * short enough that "ready" arrives while the learner is still looking at it,
 * and long enough that a two-minute generation is forty cheap requests rather
 * than four hundred. Polling stops the moment the row settles.
 */
export const NARRATION_POLL_MS = 3000;

/**
 * Bump this when the shape of a response changes. What is on disk was parsed
 * by the schema of the build that wrote it, and a restore does not parse it
 * again — so a field added to `TopicDetail` reads as `undefined` off a cache
 * written last week, on every screen, until the refetch lands. Moving the
 * version discards the whole persisted cache on the next launch and nothing
 * else; the same idea as `CARD_PROMPT_REVISION` on the server.
 */
export const PERSISTED_CACHE_VERSION = "3";

/**
 * One cache, two kinds of thing in it.
 *
 * Learner state — topics, the map with its statuses, the review batch, the
 * profile — is whatever the last device to touch it left, and somebody who
 * drilled a node on the website then picked up the phone is looking at the map
 * from before. So it is never trusted past the moment it arrived: a screen
 * mounting asks again, and so does the app coming back to the foreground. The
 * old answer stays on screen while the new one is fetched, which is what makes
 * this cheap: nothing blanks, the map just corrects itself.
 *
 * Generated content — cards and drills — is written once and cached on the
 * server by the settings it was written to, and everything that changes it
 * (content settings, a rewrite, a map edit) already writes into or invalidates
 * this cache directly. It is left alone on focus on purpose: a card being read
 * must not swap under the reader when the phone unlocks, and a drill being
 * answered must never change under a half-typed answer.
 */
export function createAppQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: QUERY_GC_MS,
        retry: 1,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  });
  client.setQueryDefaults(keys.cards, {
    staleTime: CONTENT_STALE_MS,
    refetchOnWindowFocus: false,
  });
  client.setQueryDefaults(keys.drills, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return client;
}

/**
 * What is allowed onto disk.
 *
 * Everything the default allows, minus the recordings. What that key holds is a
 * signed link with an hour on it, so a restore on the next launch paints a
 * button pointing at a URL the bucket has stopped honouring — and the press
 * that finds out is the one the persisted cache existed to make instant. It is
 * re-asked on mount like every other piece of learner state, and the answer is
 * a fresh link, so there is nothing to gain by keeping the stale one.
 */
export function shouldPersistQuery(query: Query): boolean {
  return defaultShouldDehydrateQuery(query) && query.queryKey[0] !== keys.audioOf("")[0];
}
