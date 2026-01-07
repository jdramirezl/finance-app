import { useQuery } from '@tanstack/react-query';
import { accountService } from '../../services/accountService';

/**
 * Query hook for fetching all accounts
 */
export const useAccountsQuery = () => {
    return useQuery({
        queryKey: ['accounts'],
        queryFn: async () => {
            console.log('🔄 Fetching all accounts...');
            const accounts = await accountService.getAllAccounts();
            console.log('📦 Fetched accounts:', accounts.map(acc => ({
                id: acc.id,
                name: acc.name,
                type: acc.type,
                investmentType: acc.investmentType,
                balance: acc.balance,
                principal: acc.principal,
                interestRate: acc.interestRate,
                cdCreatedAt: acc.cdCreatedAt,
                maturityDate: acc.maturityDate
            })));
            return accounts;
        },
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
