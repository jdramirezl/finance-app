import { QueryClient, notifyManager } from '@tanstack/react-query';

// Use queueMicrotask instead of setTimeout for notifications.
// Chrome throttles setTimeout(fn, 0) when the page is idle, which
// prevents TanStack Query from delivering data updates to React.
notifyManager.setScheduler(queueMicrotask);

export const queryClient = new QueryClient({
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
