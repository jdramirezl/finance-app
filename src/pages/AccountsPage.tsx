import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Account, Pocket, Currency } from '../types';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import Modal from '../components/Modal';

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
    createPocket,
    updatePocket,
    deletePocket,
    getPocketsByAccount,
  } = useFinanceStore();

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showPocketForm, setShowPocketForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingPocket, setEditingPocket] = useState<Pocket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
    loadPockets();
  }, [loadAccounts, loadPockets]);

  const selectedAccount = selectedAccountId
    ? accounts.find((acc) => acc.id === selectedAccountId)
    : null;
  const selectedAccountPockets = selectedAccountId
    ? getPocketsByAccount(selectedAccountId)
    : [];

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const color = formData.get('color') as string;
    const currency = formData.get('currency') as Currency;
    const type = (formData.get('type') as Account['type']) || 'normal';

    try {
      await createAccount(name, color, currency, type);
      // Reset form synchronously before closing modal
      form.reset();
      setShowAccountForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!editingAccount) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const updates = {
      name: formData.get('name') as string,
      color: formData.get('color') as string,
      currency: formData.get('currency') as Currency,
    };

    try {
      await updateAccount(editingAccount.id, updates);
      setEditingAccount(null);
      // Form will unmount when editingAccount is set to null, so no need to reset
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? This will also delete all its pockets.')) {
      return;
    }
    setError(null);
    try {
      await deleteAccount(id);
      if (selectedAccountId === id) {
        selectAccount(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
    }
  };

  const handleCreatePocket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!selectedAccountId) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const type = formData.get('type') as Pocket['type'];

    try {
      await createPocket(selectedAccountId, name, type);
      // Reset form synchronously before hiding
      form.reset();
      setShowPocketForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create pocket');
    }
  };

  const handleUpdatePocket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!editingPocket) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get('name') as string,
    };

    try {
      await updatePocket(editingPocket.id, updates);
      setEditingPocket(null);
      // Form will unmount when editingPocket is set to null, so no need to reset
    } catch (err: any) {
      setError(err.message || 'Failed to update pocket');
    }
  };

  const handleDeletePocket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pocket?')) {
      return;
    }
    setError(null);
    try {
      await deletePocket(id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete pocket');
    }
  };

  const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Accounts</h1>
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
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Account List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Accounts</h2>
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">
              No accounts yet. Create your first account!
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => selectAccount(account.id)}
                  className={`p-4 bg-white rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAccountId === account.id
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <div>
                        <h3 className="font-semibold">{account.name}</h3>
                        <p className="text-sm text-gray-500">
                          {account.currency} • {account.type || 'normal'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg">
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
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(account.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Account Details & Pockets */}
        <div className="space-y-4">
          {selectedAccount ? (
            <>
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Account Details</h2>
                  <button
                    onClick={() => selectAccount(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {editingAccount ? (
                  <form onSubmit={handleUpdateAccount} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingAccount.name}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Color</label>
                      <input
                        type="color"
                        name="color"
                        defaultValue={editingAccount.color}
                        required
                        className="w-full h-10 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Currency</label>
                      <select
                        name="currency"
                        defaultValue={editingAccount.currency}
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
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccount(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
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
                        <p className="font-semibold text-lg">{selectedAccount.name}</p>
                        <p className="text-sm text-gray-500">
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

              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Pockets</h2>
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
                  <form onSubmit={handleCreatePocket} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
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
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <select
                        name="type"
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                        disabled={selectedAccount?.type === 'investment'}
                      >
                        {selectedAccount?.type === 'investment' ? (
                          <>
                            <option value="normal">Shares</option>
                            <option value="normal">Invested Money</option>
                          </>
                        ) : (
                          <>
                            <option value="normal">Normal</option>
                            <option value="fixed">Fixed Expenses</option>
                          </>
                        )}
                      </select>
                      {selectedAccount?.type === 'investment' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Investment accounts use special pocket types
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPocketForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {selectedAccountPockets.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pockets yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAccountPockets.map((pocket) => (
                      <div
                        key={pocket.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{pocket.name}</p>
                          <p className="text-sm text-gray-500">
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
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePocket(pocket.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {editingPocket && (
                  <form
                    onSubmit={handleUpdatePocket}
                    className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingPocket.name}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPocket(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">
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
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  name="type"
                  defaultValue="normal"
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="normal">Normal</option>
                  <option value="investment">Investment</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};

export default AccountsPage;
