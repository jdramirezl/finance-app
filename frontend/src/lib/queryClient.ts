import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient configuration for TanStack Query
 */
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
