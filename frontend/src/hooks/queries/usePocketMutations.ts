import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pocketService } from '../../services/pocketService';
import { broadcastInvalidation } from '../../lib/crossTabSync';
import type { Pocket } from '../../types';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

// Archive/unarchive mutations invalidate `['pockets']`. TanStack Query's
// default prefix matching means any future `['pockets', '...']` sub-keys
// (e.g. an include-archived variant) will be refreshed in the same tab and
// across tabs (the receiving tab applies the same default `invalidateQueries`).

/**
 * Standalone mutation for archiving a pocket (soft delete).
 *
 * Calls `pocketService.archivePocket(id)` and invalidates `['pockets']`.
 *
 * Prefer this hook in components that only need archive. Pages that already
 * use {@link usePocketMutations} can read `archivePocket` from the bundle
 * — the bundle composes this exact hook, so the mutation logic is identical.
 */
export const useArchivePocket = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => pocketService.archivePocket(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            broadcastInvalidation([['pockets']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to archive pocket'));
        },
    });
};

/**
 * Standalone mutation for unarchiving (restoring) a previously archived
 * pocket. Calls `pocketService.unarchivePocket(id)` and invalidates
 * `['pockets']`.
 */
export const useUnarchivePocket = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => pocketService.unarchivePocket(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            broadcastInvalidation([['pockets']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to unarchive pocket'));
        },
    });
};

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

    // Archive/unarchive share their full implementation with the standalone
    // hooks — compose rather than duplicate so future changes (optimistic
    // updates, additional cache keys) are made in one place.
    const archivePocket = useArchivePocket();
    const unarchivePocket = useUnarchivePocket();

    return {
        createPocket,
        updatePocket,
        deletePocket,
        reorderPockets,
        migrateFixedPocketToAccount,
        archivePocket,
        unarchivePocket,
    };
};
