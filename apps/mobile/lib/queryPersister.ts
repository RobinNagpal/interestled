import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { QUERY_CACHE_KEY } from "./storage";

/**
 * The query cache, written to disk as it changes and read back on launch.
 *
 * This is what makes the phone fast: a launch paints the topics, the map and
 * the last card read from disk at once, and the refetch that the cache policy
 * sets off behind it is what makes it right. Without it every launch is two
 * round trips of skeleton — one to be told who is signed in, one for the list —
 * before there is anything to look at, and a train tunnel is a blank screen.
 *
 * AsyncStorage is localStorage on the web, so the website gets the same fast
 * reload for free. Writes are throttled to one a second by the persister.
 */
export const queryPersister: Persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_KEY,
});
