import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../../services/accountService';
import type { Account, CDInvestmentAccount, Currency } from '../../types';
import type { CDFormData } from '../../components/accounts/CDAccountForm';
import type { AccountFormData } from '../../components/accounts/AccountForm';
import type { useToast } from '../useToast';
import type { useAccountMutations } from '../queries/useAccountMutations';

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
  // `mutations` and toast/error/selection wiring are all that's needed now
  // that the simple-delete flow (which used `accounts` to look up the row
  // and `confirm` to gate the prompt) has been removed in favor of archive
  // + cascade delete.
  mutations: AccountMutations;
  toast: ReturnType<typeof useToast.getState>;
  setError: (value: string | null) => void;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  closeAccountForm: () => void;
  closeCDForm: () => void;
  switchToCDForm: () => void;
}

export interface UseAccountActionsResult {
  handleCreateAccount: (data: AccountFormData) => Promise<void>;
  handleUpdateAccount: (
    account: Account,
    data: AccountFormData
  ) => Promise<void>;
  handleCreateCD: (data: CDFormData) => Promise<void>;
  handleUpdateCD: (
    account: CDInvestmentAccount,
    data: CDFormData
  ) => Promise<void>;
  isAccountFormSaving: boolean;
  isCDFormSaving: boolean;
  cascadeDelete: CascadeDeleteController;
}

/**
 * Encapsulates account CRUD flows: create/update for both regular and CD
 * accounts, plus the cascade-delete dialog state machine.
 *
 * The simple "delete account" path was removed in the archive redesign —
 * the only paths that destroy data now are (a) archive (soft, reversible)
 * which lives directly on the page via `useAccountMutations.archiveAccount`,
 * and (b) cascade delete, which is gated by the dialog this hook drives.
 *
 * Mutations are received from the caller so they share the same instance
 * the rest of the page uses. Account/CD form modal open/close lives on the
 * page and is driven via the `closeAccountForm`/`closeCDForm`/`switchToCDForm`
 * callbacks.
 */
export const useAccountActions = ({
  mutations,
  toast,
  setError,
  selectedAccountId,
  setSelectedAccountId,
  closeAccountForm,
  closeCDForm,
  switchToCDForm,
}: UseAccountActionsParams): UseAccountActionsResult => {
  const queryClient = useQueryClient();
  const { createAccount, updateAccount, deleteAccountCascade } = mutations;

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
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'Failed to create Certificate of Deposit'
      );
    },
  });

  const [cascadeAccountId, setCascadeAccountId] = useState<string | null>(null);
  const [isCascadeOpen, setIsCascadeOpen] = useState(false);
  const [isCascadeDeleting, setIsCascadeDeleting] = useState(false);
  const [cascadeDeleteMovements, setCascadeDeleteMovements] = useState(false);

  const handleCreateAccount = async (data: AccountFormData) => {
    setError(null);

    try {
      // CD accounts have their own dedicated form; redirect immediately.
      if (data.type === 'cd') {
        switchToCDForm();
        return;
      }

      await createAccount.mutateAsync({
        name: data.name,
        color: data.color,
        currency: data.currency as Currency,
        type: (data.type as Account['type']) || 'normal',
        stockSymbol: data.stockSymbol || undefined,
      });
      toast.success('Account created successfully!');
      closeAccountForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create account';
      setError(msg);
      // Toast is shown by the mutation's onError handler.
    }
  };

  const handleUpdateAccount = async (
    account: Account,
    data: AccountFormData
  ) => {
    setError(null);

    try {
      await updateAccount.mutateAsync({
        id: account.id,
        updates: {
          name: data.name,
          color: data.color,
          currency: data.currency as Currency,
        },
      });
      toast.success('Account updated successfully!');
      closeAccountForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update account';
      setError(msg);
      // Toast is shown by the mutation's onError handler.
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
      // Toast is shown by the mutation's onError handler.
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
      // Toast is shown by the mutation's onError handler.
      throw err;
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
      // Toast is shown by the mutation's onError handler.
    } finally {
      setIsCascadeDeleting(false);
    }
  };

  return {
    handleCreateAccount,
    handleUpdateAccount,
    handleCreateCD,
    handleUpdateCD,
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
