import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../../services/accountService';
import type { Account } from '../../types';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

export const useAccountMutations = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    const createAccount = useMutation({
        mutationFn: (data: { name: string; color: string; currency: Account['currency']; type?: Account['type']; stockSymbol?: string }) =>
            accountService.createAccount(data.name, data.color, data.currency, data.type, data.stockSymbol),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create account'));
        },
    });

    const updateAccount = useMutation({
        mutationFn: (data: { id: string; updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>> }) =>
            accountService.updateAccount(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update account'));
        },
    });

    const deleteAccount = useMutation({
        mutationFn: (id: string) => accountService.deleteAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] }); // Pockets are deleted too
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete account'));
        },
    });

    const deleteAccountCascade = useMutation({
        mutationFn: (data: { id: string; deleteMovements: boolean }) =>
            accountService.deleteAccountCascade(data.id, data.deleteMovements),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] });
            queryClient.invalidateQueries({ queryKey: ['subPockets'] });
            queryClient.invalidateQueries({ queryKey: ['movements'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete account'));
        },
    });

    const reorderAccounts = useMutation({
        mutationFn: (accounts: Account[]) =>
            accountService.reorderAccounts(accounts.map((a) => a.id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to reorder accounts'));
        },
    });

    return {
        createAccount,
        updateAccount,
        deleteAccount,
        deleteAccountCascade,
        reorderAccounts,
    };
};
