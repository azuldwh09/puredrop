// =============================================================================
// REACT QUERY CLIENT -- src/lib/query-client.js
// =============================================================================
// Creates and exports the single React Query client instance used by the app.
//
// React Query is used for any data-fetching that benefits from automatic
// caching, background refetching, and deduplication.
//
// Current configuration:
//   staleTime: 5 minutes -- cached data is considered fresh for 5 minutes
//              before React Query refetches in the background.
// =============================================================================

import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
