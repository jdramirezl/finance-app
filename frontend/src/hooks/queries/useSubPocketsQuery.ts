import { useQuery } from '@tanstack/react-query';
import { subPocketService } from '../../services/subPocketService';

/**
 * Query hook for fetching all sub-pockets
 */
export const useSubPocketsQuery = () => {
    return useQuery({
        queryKey: ['subPockets'],
        queryFn: () => subPocketService.getAllSubPockets(),
    });
};
