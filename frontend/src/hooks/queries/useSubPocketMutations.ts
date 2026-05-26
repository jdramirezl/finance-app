import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subPocketService } from '../../services/subPocketService';
import { useToast } from '../useToast';

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

    const moveSubPocketToGroup = useMutation({
        mutationFn: (data: { subPocketId: string; groupId: string | null }) =>
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
        moveSubPocketToGroup,
    };
};
