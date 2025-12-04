import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';

/**
 * Query hook for fetching ALL active movements (excludes orphaned)
 * Movements are grouped by month on the client side
 */
export const useMovementsQuery = () => {
    return useQuery({
        queryKey: ['movements'],
        queryFn: () => movementService.getActiveMovements(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Infinite query hook for movements (for "Load More" functionality)
 * This is better for infinite scroll or load more patterns
 */
export const useInfiniteMovementsQuery = (limit = 20) => {
    return useInfiniteQuery({
        queryKey: ['movements', 'infinite'],
        queryFn: ({ pageParam }) =>
            movementService.getAllMovements(pageParam, limit),
        getNextPageParam: (lastPage, allPages) =>
            lastPage.length === limit ? allPages.length + 1 : undefined,
        initialPageParam: 1,
    });
};
