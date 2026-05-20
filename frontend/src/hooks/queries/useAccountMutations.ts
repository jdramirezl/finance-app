import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../../services/accountService';
import type { Account } from '../../types';

export const useAccountMutations = () => {
    const queryClient = useQueryClient();

    const createAccount = useMutation({
        mutationFn: (data: { name: string; color: string; currency: Account['currency']; type?: Account['type']; stockSymbol?: string }) =>
            accountService.createAccount(data.name, data.color, data.currency, data.type, data.stockSymbol),
        onSuccess: (_, variables) => {
            console.log(`🏦 Created ${variables.type || 'normal'} account: "${variables.name}" (${variables.currency})`);
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
        mutationFn: (accounts: Account[]) =>
            accountService.reorderAccounts(accounts.map((a) => a.id)),
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
