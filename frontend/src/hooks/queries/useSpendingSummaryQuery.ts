import { useQuery } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';

/**
 * Query hook for fetching spending summary (today/week/month totals).
 */
export const useSpendingSummaryQuery = () => {
    return useQuery({
        queryKey: ['movements', 'spending-summary'],
        queryFn: () => movementService.getSpendingSummary(),
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
    });
};
