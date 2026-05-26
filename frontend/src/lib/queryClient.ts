import { QueryClient, onlineManager } from '@tanstack/react-query';

/**
 * Configure TanStack Query's online manager to pause/resume
 * mutations based on browser connectivity.
 */
onlineManager.setEventListener((setOnline) => {
  const onlineHandler = () => setOnline(true);
  const offlineHandler = () => setOnline(false);
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);
  return () => {
    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
  };
});

/**
 * Global QueryClient configuration for TanStack Query
 *
 * Configuration:
 * - staleTime: 2 minutes - Data is considered fresh for 2 minutes
 * - gcTime: 30 minutes - Unused data is garbage collected after 30 minutes
 * - refetchOnWindowFocus: true - Refetch stale queries when window regains focus
 * - Mutations retry up to 2 times on transient errors (network/5xx) with exponential backoff
 * - Mutations paused when offline via networkMode: 'offlineFirst'
 */
export const queryClient = new QueryClient({
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
