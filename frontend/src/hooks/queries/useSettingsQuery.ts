import { useQuery } from '@tanstack/react-query';
import { SupabaseStorageService } from '../../services/supabaseStorageService';

/**
 * Query hook for fetching user settings
 */
export const useSettingsQuery = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: () => SupabaseStorageService.getSettings(),
    });
};
