import { useQuery } from '@tanstack/react-query';
import { settingsService } from '../../services/settingsService';

/**
 * Query hook for fetching user settings
 */
export const useSettingsQuery = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsService.getSettings(),
        staleTime: 0, // Always refetch on invalidation for instant UI updates
    });
};
