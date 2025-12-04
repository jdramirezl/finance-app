import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subPocketService } from '../../services/subPocketService';

export const useSubPocketMutations = () => {
    const queryClient = useQueryClient();

    const createSubPocket = useMutation({
        mutationFn: (data: { pocketId: string; name: string; valueTotal: number; periodicityMonths: number }) =>
            subPocketService.createSubPocket(data.pocketId, data.name, data.valueTotal, data.periodicityMonths),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const updateSubPocket = useMutation({
        mutationFn: (data: { id: string; updates: { name?: string; valueTotal?: number; periodicityMonths?: number } }) =>
            subPocketService.updateSubPocket(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const deleteSubPocket = useMutation({
        mutationFn: (id: string) => subPocketService.deleteSubPocket(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const toggleSubPocketEnabled = useMutation({
        mutationFn: (id: string) => subPocketService.toggleSubPocketEnabled(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    const moveSubPocketToGroup = useMutation({
        mutationFn: (data: { subPocketId: string; groupId: string }) =>
            subPocketService.moveToGroup(data.subPocketId, data.groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
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
