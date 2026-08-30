import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Generated cards are stable, so a revisit should be instant rather than
        // a refetch — a depth button that costs a wait is one nobody presses.
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
