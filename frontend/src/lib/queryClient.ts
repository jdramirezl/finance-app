import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';

/**
 * Debug: log all query and mutation activity to console
 */
const queryCache = new QueryCache({
  onSuccess: (data, query) => {
    const key = JSON.stringify(query.queryKey);
    if (Array.isArray(data)) {
      // Log first 3 items with id/name/archivedAt to see if data actually changed
      const preview = data.slice(0, 3).map((item: any) => ({
        id: item?.id?.slice(0, 8),
        name: item?.name,
        archivedAt: item?.archivedAt || null,
      }));
      console.log(`[QUERY OK] ${key} → ${data.length} items`, preview);
    } else {
      console.log(`[QUERY OK] ${key} → object`);
    }
  },
  onError: (error, query) => {
    console.error(`[QUERY ERR] ${JSON.stringify(query.queryKey)} →`, error);
  },
});

const mutationCache = new MutationCache({
  onSuccess: (_data, _vars, _ctx, mutation) => {
    console.log(`[MUTATION OK] ${mutation.options.mutationKey || 'anonymous'}`);
  },
  onError: (error, _vars, _ctx, mutation) => {
    console.error(`[MUTATION ERR] ${mutation.options.mutationKey || 'anonymous'} →`, error);
  },
  onSettled: (_data, _error, _vars, _ctx, mutation) => {
    console.log(`[MUTATION SETTLED] ${mutation.options.mutationKey || 'anonymous'} status=${mutation.state.status}`);
  },
});

export const queryClient = new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
        queries: {
            staleTime: 0,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: true,
            retry: 1,
        },
        mutations: {
            retry: false,
        },
    },
});

// Force all invalidations to refetch inactive queries too.
// By default, invalidateQueries only refetches ACTIVE (mounted) queries.
// This caused the bug where UI never updated unless DevTools was open
// (DevTools acts as an observer keeping queries "active").
const originalInvalidateQueries = queryClient.invalidateQueries.bind(queryClient);
queryClient.invalidateQueries = (filters?: any, options?: any) => {
  return originalInvalidateQueries({ refetchType: 'all', ...filters }, options);
};
