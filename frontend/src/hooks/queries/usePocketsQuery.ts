import { useQuery } from '@tanstack/react-query';
import { pocketService } from '../../services/pocketService';

/**
 * Query hook for fetching all pockets
 */
export const usePocketsQuery = () => {
    return useQuery({
        queryKey: ['pockets'],
        queryFn: () => pocketService.getAllPockets(),
        staleTime: 0, // Always refetch on invalidation for instant UI updates
    });
};

/**
 * Query hook for fetching all pockets including archived (soft-deleted) ones.
 *
 * Backed by a distinct query key so it caches independently from the default
 * `['pockets']` query — pages that need to surface archived pockets (for
 * restore / permanent-delete actions on the Archived section) can opt in
 * without polluting the cache used by everything else.
 *
 * Mirrors {@link useAccountsWithArchived} on purpose so the AccountsPage can
 * derive its `archivedPockets` list with the same shape it already uses for
 * archived accounts.
 */
export const usePocketsWithArchived = () => {
    return useQuery({
        queryKey: ['pockets', 'include-archived'],
        queryFn: () => pocketService.getAllPockets(true),
        staleTime: 0, // Always refetch on invalidation for instant UI updates
    });
};

/**
 * Query hook for fetching pockets by account ID
 */
export const usePocketsByAccountQuery = (accountId: string) => {
    return useQuery({
        queryKey: ['pockets', 'account', accountId],
        queryFn: () => pocketService.getPocketsByAccount(accountId),
        enabled: !!accountId,
        staleTime: 0, // Always refetch on invalidation for instant UI updates
    });
};
