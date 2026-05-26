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
            queryClient.invalidateQueries({ queryKey: ['subPockets'], exact: true });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create fixed expense'));
        },
    });

    const updateSubPocket = useMutation({
        mutationFn: (data: { id: string; updates: { name?: string; valueTotal?: number; periodicityMonths?: number } }) =>
            subPocketService.updateSubPocket(data.id, data.updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['subPockets'], exact: true });
            const previous = queryClient.getQueryData<SubPocket[]>(['subPockets']);
            queryClient.setQueryData<SubPocket[]>(['subPockets'], (old) =>
                old?.map((sp) => (sp.id === id ? { ...sp, ...updates } : sp))
            );
            return { previous };
        },
        onError: (error, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData<SubPocket[]>(['subPockets'], context.previous);
            }
            toast.error(errorMessage(error, 'Failed to update fixed expense'));
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'], exact: true });
        },
    });

    const deleteSubPocket = useMutation({
        mutationFn: (id: string) => subPocketService.deleteSubPocket(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['subPockets'], exact: true });
            const previous = queryClient.getQueryData<SubPocket[]>(['subPockets']);
            queryClient.setQueryData<SubPocket[]>(['subPockets'], (old) =>
                old?.filter((sp) => sp.id !== id)
            );
            return { previous };
        },
        onError: (error, _id, context) => {
            if (context?.previous) {
                queryClient.setQueryData<SubPocket[]>(['subPockets'], context.previous);
            }
            toast.error(errorMessage(error, 'Failed to delete fixed expense'));
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'], exact: true });
        },
    });

    const moveSubPocketToGroup = useMutation({
        mutationFn: (data: { subPocketId: string; groupId: string | null }) =>
            subPocketService.moveToGroup(data.subPocketId, data.groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'], exact: true });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to move expense'));
        },
    });

    return {
        createSubPocket,
        updateSubPocket,
        deleteSubPocket,
        moveSubPocketToGroup,
    };
};
