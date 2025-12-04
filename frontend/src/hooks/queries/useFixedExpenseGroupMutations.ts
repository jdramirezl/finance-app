import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fixedExpenseGroupService } from '../../services/fixedExpenseGroupService';

export const useFixedExpenseGroupMutations = () => {
    const queryClient = useQueryClient();

    const createFixedExpenseGroup = useMutation({
        mutationFn: (data: { name: string; color: string }) =>
            fixedExpenseGroupService.create(data.name, data.color),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixedExpenseGroups'] });
        },
    });

    const updateFixedExpenseGroup = useMutation({
        mutationFn: (data: { id: string; name: string; color: string }) =>
            fixedExpenseGroupService.update(data.id, data.name, data.color),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixedExpenseGroups'] });
        },
    });

    const deleteFixedExpenseGroup = useMutation({
        mutationFn: (id: string) => fixedExpenseGroupService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixedExpenseGroups'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] }); // Expenses moved to default group
        },
    });

    const toggleFixedExpenseGroup = useMutation({
        mutationFn: (data: { id: string; enabled: boolean }) => {
            return import('../../services/subPocketService').then(m => m.subPocketService.toggleGroup(data.id, data.enabled));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
        },
    });

    return {
        createFixedExpenseGroup,
        updateFixedExpenseGroup,
        deleteFixedExpenseGroup,
        toggleFixedExpenseGroup,
    };
};
