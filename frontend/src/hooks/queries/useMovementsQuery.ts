import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';

/**
 * Query hook for fetching movements with pagination
 */
export const useMovementsQuery = (page = 1, limit = 20) => {
    return useQuery({
        queryKey: ['movements', { page, limit }],
        queryFn: () => movementService.getAllMovements(page, limit),
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
