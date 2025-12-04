import { useQuery } from '@tanstack/react-query';
import { accountService } from '../../services/accountService';

/**
 * Query hook for fetching all accounts
 */
export const useAccountsQuery = () => {
    return useQuery({
        queryKey: ['accounts'],
        queryFn: () => accountService.getAllAccounts(),
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
    });
};
