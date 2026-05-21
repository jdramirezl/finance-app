import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../../services/settingsService';
import type { Settings } from '../../types';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

/**
 * Mutation hook for updating settings
 */
export const useUpdateSettings = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (settings: Settings) =>
            settingsService.updateSettings(settings),
        onSuccess: () => {
            // Invalidate settings query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update settings'));
        },
    });
};
