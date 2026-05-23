import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fixedExpenseGroupService } from '../../services/fixedExpenseGroupService';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

export const useFixedExpenseGroupMutations = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    const createFixedExpenseGroup = useMutation({
        mutationFn: (data: { name: string; color: string }) =>
            fixedExpenseGroupService.create(data.name, data.color),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixedExpenseGroups'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create group'));
        },
    });

    const updateFixedExpenseGroup = useMutation({
        mutationFn: (data: { id: string; name: string; color: string }) =>
            fixedExpenseGroupService.update(data.id, data.name, data.color),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixedExpenseGroups'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update group'));
        },
    });

    const deleteFixedExpenseGroup = useMutation({
        mutationFn: (id: string) => fixedExpenseGroupService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixedExpenseGroups'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] }); // Expenses moved to default group
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete group'));
        },
    });

    const reorderFixedExpenseGroups = useMutation({
        mutationFn: (ids: string[]) => fixedExpenseGroupService.reorder(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixedExpenseGroups'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to reorder groups'));
        },
    });

    return {
        createFixedExpenseGroup,
        updateFixedExpenseGroup,
        deleteFixedExpenseGroup,
        reorderFixedExpenseGroups,
    };
};
