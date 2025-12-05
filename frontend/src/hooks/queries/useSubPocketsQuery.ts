import { useQuery } from '@tanstack/react-query';
import { SupabaseStorageService } from '../../services/supabaseStorageService';

/**
 * Query hook for fetching all sub-pockets
 */
export const useSubPocketsQuery = () => {
    return useQuery({
        queryKey: ['subPockets'],
        queryFn: () => SupabaseStorageService.getSubPockets(),
    });
};
