import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subPocketService } from '../../services/subPocketService';
import { useToast } from '../useToast';
import type { SubPocket } from '../../types';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

export const useSubPocketMutations = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    const createSubPocket = useMutation({
        mutationFn: (data: { pocketId: string; name: string; valueTotal: number; periodicityMonths: number }) =>
            subPocketService.createSubPocket(data.pocketId, data.name, data.valueTotal, data.periodicityMonths),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create fixed expense'));
        },
    });

    const updateSubPocket = useMutation({
        mutationFn: (data: { id: string; updates: { name?: string; valueTotal?: number; periodicityMonths?: number } }) =>
            subPocketService.updateSubPocket(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update fixed expense'));
        },
    });

    const deleteSubPocket = useMutation({
        mutationFn: (id: string) => subPocketService.deleteSubPocket(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete fixed expense'));
        },
    });

    const toggleSubPocketEnabled = useMutation({
        mutationFn: (id: string) => subPocketService.toggleSubPocketEnabled(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['subPockets'] });
            const previous = queryClient.getQueryData(['subPockets']);
            queryClient.setQueryData(['subPockets'], (old: SubPocket[] | undefined) =>
                old?.map(sp => sp.id === id ? { ...sp, enabled: !sp.enabled } : sp)
            );
            return { previous };
        },
        onError: (error, _id, context) => {
            if (context?.previous) queryClient.setQueryData(['subPockets'], context.previous);
            toast.error(errorMessage(error, 'Failed to toggle fixed expense'));
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const moveSubPocketToGroup = useMutation({
        mutationFn: (data: { subPocketId: string; groupId: string }) =>
            subPocketService.moveToGroup(data.subPocketId, data.groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to move expense'));
        },
    });

    return {
        createSubPocket,
        updateSubPocket,
        deleteSubPocket,
        toggleSubPocketEnabled,
        moveSubPocketToGroup,
    };
};
