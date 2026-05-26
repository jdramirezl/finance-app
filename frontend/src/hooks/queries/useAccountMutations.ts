import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../../services/accountService';
import { broadcastInvalidation } from '../../lib/crossTabSync';
import type { Account } from '../../types';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

// Archive/unarchive mutations invalidate `['accounts']`. TanStack Query's
// default prefix matching means this also refreshes the
// `['accounts', 'include-archived']` cache used by `useAccountsWithArchived`,
// both in this tab and in cross-tab broadcasts (the receiving tab applies
// the same default `invalidateQueries`).

/**
 * Standalone mutation for archiving an account (soft delete).
 *
 * Calls `accountService.archiveAccount(id)` and invalidates `['accounts']`.
 *
 * Prefer this hook in components that only need archive. Pages that already
 * use {@link useAccountMutations} can read `archiveAccount` from the bundle
 * — the bundle composes this exact hook, so the mutation logic is identical.
 */
export const useArchiveAccount = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => accountService.archiveAccount(id),
        onSuccess: () => {
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['accounts'] });
            broadcastInvalidation([['accounts']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to archive account'));
        },
    });
};

/**
 * Standalone mutation for unarchiving (restoring) a previously archived
 * account. Calls `accountService.unarchiveAccount(id)` and invalidates
 * `['accounts']`.
 */
export const useUnarchiveAccount = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => accountService.unarchiveAccount(id),
        onSuccess: () => {
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['accounts'] });
            broadcastInvalidation([['accounts']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to unarchive account'));
        },
    });
};

export const useAccountMutations = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    const createAccount = useMutation({
        mutationFn: (data: { name: string; color: string; currency: Account['currency']; type?: Account['type']; stockSymbol?: string }) =>
            accountService.createAccount(data.name, data.color, data.currency, data.type, data.stockSymbol),
        onSuccess: () => {
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['accounts'] });
            broadcastInvalidation([['accounts']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create account'));
        },
    });

    const updateAccount = useMutation({
        mutationFn: (data: { id: string; updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>> }) =>
            accountService.updateAccount(data.id, data.updates),
        onSuccess: () => {
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['accounts'] });
            broadcastInvalidation([['accounts']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update account'));
        },
    });

    const deleteAccount = useMutation({
        mutationFn: (id: string) => accountService.deleteAccount(id),
        onSuccess: () => {
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['accounts'] });
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['pockets'] }); // Pockets are deleted too
            broadcastInvalidation([['accounts'], ['pockets']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete account'));
        },
    });

    const deleteAccountCascade = useMutation({
        mutationFn: (data: { id: string; deleteMovements: boolean }) =>
            accountService.deleteAccountCascade(data.id, data.deleteMovements),
        onSuccess: () => {
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['accounts'] });
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['pockets'] });
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['subPockets'] });
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['movements'] });
            broadcastInvalidation([['accounts'], ['pockets'], ['subPockets'], ['movements']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete account'));
        },
    });

    const reorderAccounts = useMutation({
        mutationFn: (accounts: Account[]) =>
            accountService.reorderAccounts(accounts.map((a) => a.id)),
        onSuccess: () => {
            window.dispatchEvent(new Event("focus")); queryClient.resetQueries({ queryKey: ['accounts'] });
            broadcastInvalidation([['accounts']]);
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to reorder accounts'));
        },
    });

    // Archive/unarchive share their full implementation with the standalone
    // hooks — compose rather than duplicate so future changes (optimistic
    // updates, additional cache keys) are made in one place.
    const archiveAccount = useArchiveAccount();
    const unarchiveAccount = useUnarchiveAccount();

    return {
        createAccount,
        updateAccount,
        deleteAccount,
        deleteAccountCascade,
        reorderAccounts,
        archiveAccount,
        unarchiveAccount,
    };
};
