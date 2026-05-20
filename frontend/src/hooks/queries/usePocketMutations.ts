import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pocketService } from '../../services/pocketService';
import type { Pocket } from '../../types';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

export const usePocketMutations = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    const createPocket = useMutation({
        mutationFn: (data: { accountId: string; name: string; type: Pocket['type'] }) =>
            pocketService.createPocket(data.accountId, data.name, data.type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Account balance might change? No, but good to refresh.
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create pocket'));
        },
    });

    const updatePocket = useMutation({
        mutationFn: (data: { id: string; updates: Partial<Pick<Pocket, 'name'>> }) =>
            pocketService.updatePocket(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update pocket'));
        },
    });

    const deletePocket = useMutation({
        mutationFn: (id: string) => pocketService.deletePocket(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete pocket'));
        },
    });

    const reorderPockets = useMutation({
        mutationFn: (pockets: Pocket[]) => {
            if (pockets.length === 0) return Promise.resolve();
            // Callers always pass pockets that belong to the same account
            // (the AccountsPage reorders pockets within a selected account).
            const accountId = pockets[0].accountId;
            return pocketService.reorderPockets(accountId, pockets.map((p) => p.id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to reorder pockets'));
        },
    });

    const migrateFixedPocketToAccount = useMutation({
        mutationFn: (data: { pocketId: string; targetAccountId: string }) =>
            pocketService.migrateFixedPocketToAccount(data.pocketId, data.targetAccountId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['movements'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to migrate pocket'));
        },
    });

    return {
        createPocket,
        updatePocket,
        deletePocket,
        reorderPockets,
        migrateFixedPocketToAccount,
    };
};
