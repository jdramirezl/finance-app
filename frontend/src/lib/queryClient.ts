import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';

/**
 * Debug: log all query and mutation activity to console
 */
const queryCache = new QueryCache({
  onSuccess: (data, query) => {
    console.log(`[QUERY OK] ${JSON.stringify(query.queryKey)} → ${Array.isArray(data) ? data.length + ' items' : 'object'}`);
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
            staleTime: 1000 * 60 * 2,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: true,
            retry: 1,
        },
        mutations: {
            retry: false,
        },
    },
});
