import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../services/accountService';
import type { Account, CDInvestmentAccount, Currency } from '../types';
import type { CDFormData } from '../components/accounts/CDAccountForm';
import type { useToast } from './useToast';
import type { useConfirm } from './useConfirm';
import type { useAccountMutations } from './queries/useAccountMutations';

type AccountMutations = ReturnType<typeof useAccountMutations>;

export interface CascadeDeleteController {
  isOpen: boolean;
  accountId: string | null;
  isDeleting: boolean;
  deleteMovements: boolean;
  setDeleteMovements: (value: boolean) => void;
  open: (id: string) => void;
  close: () => void;
  confirm: () => Promise<void>;
}

export interface UseAccountActionsParams {
  accounts: Account[];
  mutations: AccountMutations;
  confirm: ReturnType<typeof useConfirm>['confirm'];
  toast: ReturnType<typeof useToast.getState>;
  setError: (value: string | null) => void;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  closeAccountForm: () => void;
  closeCDForm: () => void;
  switchToCDForm: () => void;
}

export interface UseAccountActionsResult {
  handleCreateAccount: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleUpdateAccount: (
    account: Account,
    e: React.FormEvent<HTMLFormElement>
  ) => Promise<void>;
  handleCreateCD: (data: CDFormData) => Promise<void>;
  handleUpdateCD: (
    account: CDInvestmentAccount,
    data: CDFormData
  ) => Promise<void>;
  handleDeleteAccount: (id: string) => Promise<void>;
  isAccountFormSaving: boolean;
  isCDFormSaving: boolean;
  cascadeDelete: CascadeDeleteController;
}

/**
 * Encapsulates account CRUD flows: create/update for both regular and CD
 * accounts, single delete with a confirm prompt, and cascade delete with
 * its dialog state machine.
 *
 * Mutations are received from the caller so they share the same instance
 * the rest of the page uses. Account/CD form modal open/close lives on the
 * page and is driven via the `closeAccountForm`/`closeCDForm`/`switchToCDForm`
 * callbacks.
 */
export const useAccountActions = ({
  accounts,
  mutations,
  confirm,
  toast,
  setError,
  selectedAccountId,
  setSelectedAccountId,
  closeAccountForm,
  closeCDForm,
  switchToCDForm,
}: UseAccountActionsParams): UseAccountActionsResult => {
  const queryClient = useQueryClient();
  const { createAccount, updateAccount, deleteAccount, deleteAccountCascade } =
    mutations;

  // CD creation goes through accountService directly. Wrap it as a mutation
  // here so cache invalidation stays consistent and we can read `.isPending`.
  const createCDMutation = useMutation({
    mutationFn: (data: CDFormData) =>
      accountService.createCDAccount(
        data.name,
        data.color,
        data.currency,
        data.principal,
        data.interestRate,
        data.termMonths,
        data.compoundingFrequency,
        data.earlyWithdrawalPenalty,
        data.withholdingTaxRate
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const [cascadeAccountId, setCascadeAccountId] = useState<string | null>(null);
  const [isCascadeOpen, setIsCascadeOpen] = useState(false);
  const [isCascadeDeleting, setIsCascadeDeleting] = useState(false);
  const [cascadeDeleteMovements, setCascadeDeleteMovements] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    try {
      const accountType = formData.get('type') as string;

      // CD accounts have their own dedicated form; redirect immediately.
      if (accountType === 'cd') {
        switchToCDForm();
        return;
      }

      await createAccount.mutateAsync({
        name: formData.get('name') as string,
        color: formData.get('color') as string,
        currency: formData.get('currency') as Currency,
        type: (formData.get('type') as Account['type']) || 'normal',
        stockSymbol: (formData.get('stockSymbol') as string) || undefined,
      });
      toast.success('Account created successfully!');
      closeAccountForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create account';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleUpdateAccount = async (
    account: Account,
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    try {
      await updateAccount.mutateAsync({
        id: account.id,
        updates: {
          name: formData.get('name') as string,
          color: formData.get('color') as string,
          currency: formData.get('currency') as Currency,
        },
      });
      toast.success('Account updated successfully!');
      closeAccountForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update account';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleCreateCD = async (data: CDFormData) => {
    setError(null);
    try {
      await createCDMutation.mutateAsync(data);
      toast.success('Certificate of Deposit created successfully!');
      closeCDForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create CD';
      setError(msg);
      toast.error(msg);
      throw err;
    }
  };

  const handleUpdateCD = async (
    account: CDInvestmentAccount,
    data: CDFormData
  ) => {
    setError(null);
    try {
      // CD term-related fields are immutable for financial accuracy;
      // only basic info (name, color, currency) is editable.
      await updateAccount.mutateAsync({
        id: account.id,
        updates: {
          name: data.name,
          color: data.color,
          currency: data.currency,
        },
      });
      toast.success('CD updated successfully!');
      closeCDForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update CD';
      setError(msg);
      toast.error(msg);
      throw err;
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    const confirmed = await confirm({
      title: 'Delete Account',
      message: `Are you sure you want to delete "${account?.name}"? This will also delete all its pockets and cannot be undone.`,
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setError(null);
    try {
      if (selectedAccountId === id) {
        setSelectedAccountId(null);
      }
      await deleteAccount.mutateAsync(id);
      toast.success('Account deleted successfully!');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete account';
      setError(msg);
      toast.error(msg);
    }
  };

  const openCascade = (id: string) => {
    setCascadeAccountId(id);
    setCascadeDeleteMovements(false);
    setIsCascadeOpen(true);
  };

  const closeCascade = () => {
    if (isCascadeDeleting) return;
    setIsCascadeOpen(false);
    setCascadeAccountId(null);
  };

  const confirmCascade = async () => {
    if (!cascadeAccountId) return;
    setIsCascadeDeleting(true);
    setError(null);
    try {
      const result = await deleteAccountCascade.mutateAsync({
        id: cascadeAccountId,
        deleteMovements: cascadeDeleteMovements,
      });

      if (selectedAccountId === cascadeAccountId) {
        setSelectedAccountId(null);
      }

      setIsCascadeOpen(false);
      setCascadeAccountId(null);

      toast.success(
        `Deleted account "${result.account}" with ${result.pockets} pocket(s), ${result.subPockets} sub-pocket(s)` +
          (result.movements > 0 ? `, and ${result.movements} movement(s)` : '')
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete account';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsCascadeDeleting(false);
    }
  };

  return {
    handleCreateAccount,
    handleUpdateAccount,
    handleCreateCD,
    handleUpdateCD,
    handleDeleteAccount,
    isAccountFormSaving: createAccount.isPending || updateAccount.isPending,
    isCDFormSaving: createCDMutation.isPending || updateAccount.isPending,
    cascadeDelete: {
      isOpen: isCascadeOpen,
      accountId: cascadeAccountId,
      isDeleting: isCascadeDeleting,
      deleteMovements: cascadeDeleteMovements,
      setDeleteMovements: setCascadeDeleteMovements,
      open: openCascade,
      close: closeCascade,
      confirm: confirmCascade,
    },
  };
};
