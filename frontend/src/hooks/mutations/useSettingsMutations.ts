import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseStorageService } from '../../services/supabaseStorageService';
import type { Settings } from '../../types';

/**
 * Mutation hook for updating settings
 */
export const useUpdateSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: Settings) =>
            SupabaseStorageService.saveSettings(settings),
        onSuccess: () => {
            // Invalidate settings query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
};
