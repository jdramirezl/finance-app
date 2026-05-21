import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pocketService } from '../../services/pocketService';
import { broadcastInvalidation } from '../../lib/crossTabSync';
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
            // Creating a pocket adds an empty container to an existing account
            // — the account's balance is unchanged, so we don't invalidate
            // `['accounts']`. The pockets query gets the new entry on its next
            // fetch.
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            broadcastInvalidation([['pockets']]);
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
            broadcastInvalidation([['pockets']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update pocket'));
        },
    });

    const deletePocket = useMutation({
        mutationFn: (id: string) => pocketService.deletePocket(id),
        onSuccess: () => {
            // Deleting a pocket removes its balance from the parent account
            // (movements become orphans), so account totals shift.
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            broadcastInvalidation([['pockets'], ['accounts']]);
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
            broadcastInvalidation([['pockets']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to reorder pockets'));
        },
    });

    const migrateFixedPocketToAccount = useMutation({
        mutationFn: (data: { pocketId: string; targetAccountId: string }) =>
            pocketService.migrateFixedPocketToAccount(data.pocketId, data.targetAccountId),
        onSuccess: () => {
            // Migration moves balances and rewires movements between accounts.
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            broadcastInvalidation([['pockets'], ['accounts'], ['movements']]);
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
