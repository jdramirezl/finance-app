import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient configuration for TanStack Query
 * 
 * Configuration:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - gcTime: 30 minutes - Unused data is garbage collected after 30 minutes
 * - refetchOnWindowFocus: false - Don't refetch when window regains focus
 * - retry: 1 - Retry failed requests once before showing error
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime in v4)
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
