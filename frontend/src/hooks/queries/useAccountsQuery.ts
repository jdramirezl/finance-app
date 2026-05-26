import { useQuery } from '@tanstack/react-query';
import { accountService } from '../../services/accountService';

/**
 * Query hook for fetching all accounts
 */
export const useAccountsQuery = () => {
    return useQuery({
        queryKey: ['accounts'],
        queryFn: () => accountService.getAllAccounts(),
        staleTime: 0,
    });
};

/**
 * Query hook for fetching all accounts including archived (soft-deleted) ones.
 *
 * Backed by a distinct query key so it caches independently from the default
 * `['accounts']` query — pages that need to surface archived accounts (for
 * restore/permanent-delete actions) can opt in without polluting the cache
 * used by everything else.
 */
export const useAccountsWithArchived = () => {
    return useQuery({
        queryKey: ['accounts', 'include-archived'],
        queryFn: () => accountService.getAllAccounts(true),
        staleTime: 0,
    });
};

/**
 * Query hook for fetching a single account by ID
 */
export const useAccountQuery = (accountId: string) => {
    return useQuery({
        queryKey: ['accounts', accountId],
        queryFn: () => accountService.getAccount(accountId),
        enabled: !!accountId, // Only run query if accountId is provided
        staleTime: 0,
    });
};
