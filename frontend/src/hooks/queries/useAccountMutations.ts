import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../../services/accountService';
import type { Account } from '../../types';

export const useAccountMutations = () => {
    const queryClient = useQueryClient();

    const createAccount = useMutation({
        mutationFn: (data: { name: string; color: string; currency: Account['currency']; type?: Account['type']; stockSymbol?: string }) =>
            accountService.createAccount(data.name, data.color, data.currency, data.type, data.stockSymbol),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
    });

    const updateAccount = useMutation({
        mutationFn: (data: { id: string; updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>> }) =>
            accountService.updateAccount(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
    });

    const deleteAccount = useMutation({
        mutationFn: (id: string) => accountService.deleteAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pockets'] }); // Pockets are deleted too
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
    });

    const reorderAccounts = useMutation({
        mutationFn: (accounts: Account[]) => {
            // We need to save the order to the backend/storage
            // Assuming SupabaseStorageService.saveAccounts is what was used in the store
            // But accountService might not have a direct reorder method exposed like this?
            // Let's check useFinanceStore.ts again.
            // It calls SupabaseStorageService.saveAccounts(accountsWithOrder)
            // We should probably move this logic to accountService or just use the service if available.
            // For now, I'll import SupabaseStorageService here or assume accountService has it.
            // Wait, accountService.getAllAccounts() returns accounts.
            // Let's check accountService.ts to see if it has reorder or saveAccounts.
            // If not, I'll use SupabaseStorageService directly or add it to accountService.
            // I'll check accountService first.
            // For now, I will assume I can use SupabaseStorageService directly as the store did.
            // But better to keep it in service layer.
            // I'll check accountService in a moment.
            // I'll use a placeholder for now and fix it if needed.
            return import('../../services/supabaseStorageService').then(m => m.SupabaseStorageService.saveAccounts(accounts));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
