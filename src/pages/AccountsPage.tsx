import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import type { Account, Pocket, Currency } from '../types';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableList from '../components/SortableList';
import SortableItem from '../components/SortableItem';
import { Skeleton, SkeletonList } from '../components/Skeleton';

const AccountsPage = () => {
  const {
    accounts,
    selectedAccountId,
    loadAccounts,
    loadPockets,
    createAccount,
    updateAccount,
    deleteAccount,
    selectAccount,
    reorderAccounts,
    createPocket,
    updatePocket,
    deletePocket,
    reorderPockets,
    getPocketsByAccount,
  } = useFinanceStore();

  const toast = useToast();
  const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showPocketForm, setShowPocketForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingPocket, setEditingPocket] = useState<Pocket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'normal' | 'investment'>('normal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Button-level loading
  const [_deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [_deletingPocketId, setDeletingPocketId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // loadAccounts now loads accounts, pockets, and subPockets in one call
        await loadAccounts();
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load accounts and pockets');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadAccounts, toast]);

  const selectedAccount = selectedAccountId
    ? accounts.find((acc) => acc.id === selectedAccountId) || null
    : null;
  const selectedAccountPockets = selectedAccountId
    ? getPocketsByAccount(selectedAccountId)
    : [];

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const color = formData.get('color') as string;
    const currency = formData.get('currency') as Currency;
    const type = (formData.get('type') as Account['type']) || 'normal';
    const stockSymbol = (formData.get('stockSymbol') as string) || undefined;

    try {
      // Optimistic: close form immediately, store handles optimistic update
      form.reset();
      setShowAccountForm(false);
      
      await createAccount(name, color, currency, type, stockSymbol);
      toast.success('Account created successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      toast.error(err instanceof Error ? err.message : 'Failed to create account');
      setShowAccountForm(true); // Reopen on error
    } finally {
      setIsSaving(false);
    }
  };
  const handleUpdateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!editingAccount) return;

    setIsSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const updates = {
      name: formData.get('name') as string,
      color: formData.get('color') as string,
      currency: formData.get('currency') as Currency,
    };

    try {
      // Optimistic: close form immediately, store handles optimistic update
      setEditingAccount(null);
      
      await updateAccount(editingAccount.id, updates);
      toast.success('Account updated successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
      toast.error(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const account = accounts.find(a => a.id === id);
    const confirmed = await confirm({
      title: 'Delete Account',
      message: `Are you sure you want to delete "${account?.name}"? This will also delete all its pockets and cannot be undone.`,
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setError(null);
    setDeletingAccountId(id);
    try {
      // Optimistic: UI updates immediately via store
      if (selectedAccountId === id) {
        selectAccount(null);
      }
      await deleteAccount(id);
      toast.success('Account deleted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleCreatePocket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!selectedAccountId) return;

    setIsSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    let name: string;
    let type: Pocket['type'] = 'normal';
    if (selectedAccount?.type === 'investment') {
      const kind = formData.get('investmentKind') as string;
      if (!kind) {
        setError('Please select an investment pocket');
        setIsSaving(false);
        return;
      }
      name = kind === 'shares' ? 'Shares' : 'Invested Money';
      type = 'normal';
    } else {
      name = formData.get('name') as string;
      type = formData.get('type') as Pocket['type'];
    }

    try {
      // Optimistic: close form immediately, store handles optimistic update
      form.reset();
      setShowPocketForm(false);
      
      await createPocket(selectedAccountId, name, type);
      toast.success('Pocket created successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create pocket');
      toast.error(err instanceof Error ? err.message : 'Failed to create pocket');
      setShowPocketForm(true); // Reopen on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePocket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!editingPocket) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get('name') as string,
    };

    try {
      // Optimistic: close form immediately, store handles optimistic update
      setEditingPocket(null);
      
      await updatePocket(editingPocket.id, updates);
      toast.success('Pocket updated successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update pocket');
      toast.error(err instanceof Error ? err.message : 'Failed to update pocket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePocket = async (id: string) => {
    const pocket = selectedAccountPockets.find(p => p.id === id);
    const confirmed = await confirm({
      title: 'Delete Pocket',
      message: `Are you sure you want to delete "${pocket?.name}"? This action cannot be undone.`,
      confirmText: 'Delete Pocket',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setError(null);
    setDeletingPocketId(id);
    try {
      // Optimistic: UI updates immediately via store
      await deletePocket(id);
      toast.success('Pocket deleted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete pocket';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeletingPocketId(null);
    }
  };

  const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <SkeletonList items={3} />
      </div>
    );
  }

  if (false && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Accounts</h1>
        <button
          onClick={() => {
            setShowAccountForm(true);
            setEditingAccount(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Account
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Account List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">All Accounts</h2>
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
              No accounts yet. Create your first account!
            </div>
          ) : (
            <SortableList
              items={[...accounts].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))}
              onReorder={reorderAccounts}
              getId={(account) => account.id}
              renderItem={(account) => (
                <SortableItem key={account.id} id={account.id}>
                  <div
                    onClick={() => selectAccount(account.id)}
                    className={`p-4 bg-white dark:bg-gray-800 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAccountId === account.id
                        ? 'border-blue-500 dark:border-blue-400 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: account.color }}
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{account.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {account.currency} • {account.type || 'normal'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg text-gray-900 dark:text-gray-100">
                          {account.balance.toLocaleString(undefined, {
                            style: 'currency',
                            currency: account.currency,
                          })}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAccount(account);
                            setShowAccountForm(false);
                          }}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAccount(account.id);
                          }}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </SortableItem>
              )}
            />
          )}
        </div>

        {/* Right: Account Details & Pockets */}
        <div className="space-y-4">
          {selectedAccount ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Account Details</h2>
                  <button
                    onClick={() => selectAccount(null)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {editingAccount ? (
                  <form onSubmit={handleUpdateAccount} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingAccount.name}
                        required
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Color</label>
                      <input
                        type="color"
                        name="color"
                        defaultValue={editingAccount.color}
                        required
                        className="w-full h-10 border dark:border-gray-600 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Currency</label>
                      <select
                        name="currency"
                        defaultValue={editingAccount.currency}
                        required
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        {currencies.map((curr) => (
                          <option key={curr} value={curr}>
                            {curr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={isSaving}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingAccount(null)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: selectedAccount.color }}
                      />
                      <div>
                        <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{selectedAccount.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedAccount.currency} • Balance:{' '}
                          {selectedAccount.balance.toLocaleString(undefined, {
                            style: 'currency',
                            currency: selectedAccount.currency,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pockets</h2>
                  <button
                    onClick={() => {
                      setShowPocketForm(true);
                      setEditingPocket(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    New Pocket
                  </button>
                </div>

                {showPocketForm && (
                  <form onSubmit={handleCreatePocket} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                    {selectedAccount?.type === 'investment' ? (
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Investment pocket</label>
                        <select
                          name="investmentKind"
                          required
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="" disabled>Select one</option>
                          <option value="shares" disabled={selectedAccountPockets.some((p) => p.name === 'Shares')}>
                            Shares {selectedAccountPockets.some((p) => p.name === 'Shares') ? '(already created)' : ''}
                          </option>
                          <option value="invested" disabled={selectedAccountPockets.some((p) => p.name === 'Invested Money')}>
                            Invested Money {selectedAccountPockets.some((p) => p.name === 'Invested Money') ? '(already created)' : ''}
                          </option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only one of each is allowed per investment account.</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Name</label>
                          <input
                            type="text"
                            name="name"
                            required
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Type</label>
                          <select
                            name="type"
                            required
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="normal">Normal</option>
                            <option value="fixed">Fixed Expenses</option>
                          </select>
                        </div>
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={isSaving}
                        className="flex-1"
                      >
                        Create
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowPocketForm(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {selectedAccountPockets.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No pockets yet</p>
                ) : (
                  <SortableList
                    items={[...selectedAccountPockets].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))}
                    onReorder={reorderPockets}
                    getId={(pocket) => pocket.id}
                    renderItem={(pocket) => (
                      <SortableItem key={pocket.id} id={pocket.id}>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{pocket.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {pocket.type} •{' '}
                              {pocket.balance.toLocaleString(undefined, {
                                style: 'currency',
                                currency: pocket.currency,
                              })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingPocket(pocket);
                                setShowPocketForm(false);
                              }}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePocket(pocket.id)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </SortableItem>
                    )}
                  />
                )}

                {editingPocket && (
                  <form
                    onSubmit={handleUpdatePocket}
                    className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingPocket.name}
                        required
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={isSaving}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingPocket(null)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
              Select an account to view details
            </div>
          )}
        </div>
      </div>

      {/* Account Creation Form Modal */}
      {showAccountForm && !editingAccount && (
        <Modal
          isOpen={showAccountForm}
          onClose={() => setShowAccountForm(false)}
          title="Create New Account"
        >
          <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input
                  type="color"
                  name="color"
                  defaultValue="#3b82f6"
                  required
                  className="w-full h-10 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  name="currency"
                  defaultValue="USD"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {currencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Type</label>
                <select
                  name="type"
                  id="accountType"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as 'normal' | 'investment')}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="normal">Normal</option>
                  <option value="investment">Investment</option>
                </select>
              </div>
              {accountType === 'investment' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Stock Symbol (e.g., VOO)</label>
                <input
                  type="text"
                  name="stockSymbol"
                  defaultValue="VOO"
                  placeholder="VOO"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The stock/ETF symbol for this investment account
                </p>
              </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSaving}
                  className="flex-1"
                >
                  Create
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAccountForm(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </div>
  );
};

export default AccountsPage;
