import {
    useQuery,
    useInfiniteQuery,
    keepPreviousData,
} from '@tanstack/react-query';
import { movementService } from '../../services/movementService';
import { useSettingsQuery } from './useSettingsQuery';

/**
 * Default page size used by the paginated movements queries.
 *
 * Chosen to be large enough that most users see "everything" on the
 * first page, but small enough that the initial render isn't blocked
 * by a multi-thousand-row payload.
 */
const DEFAULT_MOVEMENTS_PAGE_SIZE = 50;

/**
 * Query hook for fetching ALL active movements (excludes orphaned).
 *
 * Used by callers that operate on the full active set (calendar widget,
 * mark-as-paid modal). Internally goes through the paginated endpoint
 * with a high limit — see {@link movementService.getActiveMovements} —
 * and keeps the legacy `Movement[]` return shape so existing consumers
 * don't need to change.
 *
 * For new feature work that needs incremental loading, prefer
 * {@link useInfiniteMovementsQuery}.
 */
export const useMovementsQuery = () => {
    return useQuery({
        queryKey: ['movements'],
        queryFn: () => movementService.getActiveMovements(),
        staleTime: 0,
        // Keep previous data visible during refetch for instant page transitions.
        placeholderData: keepPreviousData,
    });
};

/**
 * Infinite query hook for movements (used by the movements page).
 *
 * Drives the "Load More" pattern: each page is fetched with the
 * paginated endpoint, and `getNextPageParam` returns the next page
 * number iff the server reports `hasMore`. Comparing
 * `data.length === limit` would be incorrect on the boundary case
 * where the total count is an exact multiple of the page size.
 */
export const useInfiniteMovementsQuery = (
    limitOverride?: number,
    filters?: { category?: string; tags?: string[] },
) => {
    const { data: settings } = useSettingsQuery();
    const limit = limitOverride ?? settings?.movementsPerPage ?? DEFAULT_MOVEMENTS_PAGE_SIZE;

    return useInfiniteQuery({
        queryKey: ['movements', 'infinite', limit, filters?.category, filters?.tags],
        queryFn: ({ pageParam }) =>
            movementService.getAllMovementsPaginated(pageParam, limit, filters),
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
        staleTime: 0,
    });
};
