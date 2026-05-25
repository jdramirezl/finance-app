import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useAccountActions } from '../actions/useAccountActions';
import type { UseAccountActionsParams } from '../actions/useAccountActions';
import type { Account, CDInvestmentAccount } from '../../types';
import type { AccountFormData } from '../../components/accounts/AccountForm';
import type { CDFormData } from '../../components/accounts/CDAccountForm';

// The hook wraps `accountService.createCDAccount` in a useMutation. Stub the
// service so we can drive success/failure paths without touching the network.
vi.mock('../../services/accountService', () => ({
  accountService: {
    createCDAccount: vi.fn().mockResolvedValue({ id: 'cd-new' }),
  },
}));

import { accountService } from '../../services/accountService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Checking',
  color: '#3B82F6',
  currency: 'USD',
  balance: 1000,
  type: 'normal',
  ...overrides,
});

const baseAccountFormData: AccountFormData = {
  name: 'New Account',
  color: '#10B981',
  currency: 'USD',
  type: 'normal',
};

const baseCDFormData: CDFormData = {
  name: 'My CD',
  color: '#F59E0B',
  currency: 'USD',
  principal: 10000,
  interestRate: 4.5,
  termMonths: 12,
  compoundingFrequency: 'monthly',
};

interface MutationStub {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}

const buildParams = (overrides: Partial<UseAccountActionsParams> = {}): {
  params: UseAccountActionsParams;
  createAccount: MutationStub;
  updateAccount: MutationStub;
  deleteAccountCascade: MutationStub;
  toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  setError: ReturnType<typeof vi.fn>;
  setSelectedAccountId: ReturnType<typeof vi.fn>;
  closeAccountForm: ReturnType<typeof vi.fn>;
  closeCDForm: ReturnType<typeof vi.fn>;
  switchToCDForm: ReturnType<typeof vi.fn>;
} => {
  const createAccount: MutationStub = { mutateAsync: vi.fn().mockResolvedValue({ id: 'acc-new' }), isPending: false };
  const updateAccount: MutationStub = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
  const deleteAccountCascade: MutationStub = {
    mutateAsync: vi.fn().mockResolvedValue({ account: 'Checking', pockets: 2, subPockets: 0, movements: 5 }),
    isPending: false,
  };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  const setError = vi.fn();
  const setSelectedAccountId = vi.fn();
  const closeAccountForm = vi.fn();
  const closeCDForm = vi.fn();
  const switchToCDForm = vi.fn();

  const params: UseAccountActionsParams = {
    mutations: {
      createAccount,
      updateAccount,
      // deleteAccount kept on the underlying mutation bundle but no longer
      // surfaced through useAccountActions.
      deleteAccount: { mutateAsync: vi.fn(), isPending: false },
      deleteAccountCascade,
      reorderAccounts: { mutateAsync: vi.fn(), isPending: false },
    } as unknown as UseAccountActionsParams['mutations'],
    toast: toast as unknown as UseAccountActionsParams['toast'],
    setError,
    selectedAccountId: null,
    setSelectedAccountId,
    closeAccountForm,
    closeCDForm,
    switchToCDForm,
    ...overrides,
  };

  return {
    params,
    createAccount,
    updateAccount,
    deleteAccountCascade,
    toast,
    setError,
    setSelectedAccountId,
    closeAccountForm,
    closeCDForm,
    switchToCDForm,
  };
};

const setup = (overrides: Partial<UseAccountActionsParams> = {}) => {
  const fixtures = buildParams(overrides);
  const wrapper = createWrapper();
  const rendered = renderHook(() => useAccountActions(fixtures.params), { wrapper });
  return { ...fixtures, ...rendered };
};

describe('useAccountActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCreateAccount', () => {
    it('creates a regular account and closes the form on success', async () => {
      const { result, createAccount, toast, closeAccountForm, setError } = setup();

      await act(async () => {
        await result.current.handleCreateAccount(baseAccountFormData);
      });

      expect(setError).toHaveBeenCalledWith(null);
      expect(createAccount.mutateAsync).toHaveBeenCalledWith({
        name: 'New Account',
        color: '#10B981',
        currency: 'USD',
        type: 'normal',
        stockSymbol: undefined,
      });
      expect(toast.success).toHaveBeenCalledWith('Account created successfully!');
      expect(closeAccountForm).toHaveBeenCalled();
    });

    it('redirects to the CD form when type is "cd" without creating an account', async () => {
      const { result, createAccount, switchToCDForm, closeAccountForm } = setup();

      await act(async () => {
        await result.current.handleCreateAccount({ ...baseAccountFormData, type: 'cd' });
      });

      expect(switchToCDForm).toHaveBeenCalled();
      expect(createAccount.mutateAsync).not.toHaveBeenCalled();
      expect(closeAccountForm).not.toHaveBeenCalled();
    });

    it('forwards mutation errors via setError without closing the form', async () => {
      const { result, createAccount, setError, closeAccountForm } = setup();
      createAccount.mutateAsync.mockRejectedValueOnce(new Error('duplicate name'));

      await act(async () => {
        await result.current.handleCreateAccount(baseAccountFormData);
      });

      expect(setError).toHaveBeenLastCalledWith('duplicate name');
      expect(closeAccountForm).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdateAccount', () => {
    it('updates an account and closes the form on success', async () => {
      const { result, updateAccount, toast, closeAccountForm } = setup();
      const account = mockAccount({ id: 'acc-7' });

      await act(async () => {
        await result.current.handleUpdateAccount(account, {
          ...baseAccountFormData,
          name: 'Renamed',
          currency: 'MXN',
        });
      });

      expect(updateAccount.mutateAsync).toHaveBeenCalledWith({
        id: 'acc-7',
        updates: {
          name: 'Renamed',
          color: '#10B981',
          currency: 'MXN',
        },
      });
      expect(toast.success).toHaveBeenCalledWith('Account updated successfully!');
      expect(closeAccountForm).toHaveBeenCalled();
    });

    it('reports update errors through setError', async () => {
      const { result, updateAccount, setError, closeAccountForm } = setup();
      updateAccount.mutateAsync.mockRejectedValueOnce(new Error('boom'));

      await act(async () => {
        await result.current.handleUpdateAccount(mockAccount(), baseAccountFormData);
      });

      expect(setError).toHaveBeenLastCalledWith('boom');
      expect(closeAccountForm).not.toHaveBeenCalled();
    });
  });

  describe('handleCreateCD', () => {
    it('delegates to accountService.createCDAccount and closes the CD form', async () => {
      const { result, toast, closeCDForm } = setup();

      await act(async () => {
        await result.current.handleCreateCD(baseCDFormData);
      });

      expect(accountService.createCDAccount).toHaveBeenCalledWith(
        'My CD',
        '#F59E0B',
        'USD',
        10000,
        4.5,
        12,
        'monthly',
        undefined,
        undefined,
      );
      expect(toast.success).toHaveBeenCalledWith('Certificate of Deposit created successfully!');
      expect(closeCDForm).toHaveBeenCalled();
    });

    it('rethrows errors from the CD service so callers can react', async () => {
      const { result, setError, closeCDForm } = setup();
      vi.mocked(accountService.createCDAccount).mockRejectedValueOnce(new Error('cd failed'));

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.handleCreateCD(baseCDFormData);
        } catch (err) {
          caught = err;
        }
      });

      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toBe('cd failed');
      // The catch block sets the error message before rethrowing. We assert
      // the message was forwarded at some point rather than relying on the
      // exact ordering of the leading `setError(null)` reset call.
      expect(setError).toHaveBeenCalledWith('cd failed');
      expect(closeCDForm).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdateCD', () => {
    it('only updates basic fields (name, color, currency) on a CD account', async () => {
      const { result, updateAccount, toast, closeCDForm } = setup();
      const cd: CDInvestmentAccount = {
        id: 'cd-1',
        name: 'My CD',
        color: '#F59E0B',
        currency: 'USD',
        balance: 10000,
        type: 'cd',
        investmentType: 'cd',
        principal: 10000,
        interestRate: 4.5,
        termMonths: 12,
        maturityDate: '2026-01-01',
        compoundingFrequency: 'monthly',
      };

      await act(async () => {
        await result.current.handleUpdateCD(cd, { ...baseCDFormData, name: 'CD Renamed' });
      });

      expect(updateAccount.mutateAsync).toHaveBeenCalledWith({
        id: 'cd-1',
        updates: {
          name: 'CD Renamed',
          color: '#F59E0B',
          currency: 'USD',
        },
      });
      expect(toast.success).toHaveBeenCalledWith('CD updated successfully!');
      expect(closeCDForm).toHaveBeenCalled();
    });
  });

  describe('cascadeDelete', () => {
    it('opens with the supplied account id and resets the deleteMovements flag', () => {
      const { result } = setup();

      act(() => {
        result.current.cascadeDelete.open('acc-9');
      });

      expect(result.current.cascadeDelete.isOpen).toBe(true);
      expect(result.current.cascadeDelete.accountId).toBe('acc-9');
      expect(result.current.cascadeDelete.deleteMovements).toBe(false);
    });

    it('runs the cascade mutation, clears selection on match, and reports a success toast', async () => {
      const { result, deleteAccountCascade, toast, setSelectedAccountId } = setup({
        selectedAccountId: 'acc-9',
      });

      act(() => {
        result.current.cascadeDelete.open('acc-9');
      });
      act(() => {
        result.current.cascadeDelete.setDeleteMovements(true);
      });

      await act(async () => {
        await result.current.cascadeDelete.confirm();
      });

      expect(deleteAccountCascade.mutateAsync).toHaveBeenCalledWith({
        id: 'acc-9',
        deleteMovements: true,
      });
      expect(setSelectedAccountId).toHaveBeenCalledWith(null);
      expect(toast.success).toHaveBeenCalledWith(
        'Deleted account "Checking" with 2 pocket(s), 0 sub-pocket(s), and 5 movement(s)',
      );
      expect(result.current.cascadeDelete.isOpen).toBe(false);
    });

    it('does nothing when confirming with no selected account id', async () => {
      const { result, deleteAccountCascade } = setup();

      await act(async () => {
        await result.current.cascadeDelete.confirm();
      });

      expect(deleteAccountCascade.mutateAsync).not.toHaveBeenCalled();
    });
  });
});
