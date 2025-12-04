import { useQuery } from '@tanstack/react-query';
import { pocketService } from '../../services/pocketService';

/**
 * Query hook for fetching all pockets
 */
export const usePocketsQuery = () => {
    return useQuery({
        queryKey: ['pockets'],
        queryFn: () => pocketService.getAllPockets(),
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
    });
};
