import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Movement, MovementType, Account, Pocket, SubPocket } from '../types';
import { Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Modal from '../components/Modal';

const MovementsPage = () => {
  const {
    accounts,
    pockets,
    subPockets,
    movements,
    loadAccounts,
    loadPockets,
    loadSubPockets,
    loadMovements,
    createMovement,
    updateMovement,
    deleteMovement,
    getPocketsByAccount,
    getSubPocketsByPocket,
  } = useFinanceStore();

  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPocketId, setSelectedPocketId] = useState<string>('');
  const [isFixedExpense, setIsFixedExpense] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadPockets();
    loadSubPockets();
    loadMovements();
  }, [loadAccounts, loadPockets, loadSubPockets, loadMovements]);

  // Get movements grouped by month
  const movementsByMonth = Array.from(
    movements.reduce((acc, movement) => {
      const date = parseISO(movement.displayedDate);
      const monthKey = format(date, 'yyyy-MM');
      if (!acc.has(monthKey)) {
        acc.set(monthKey, []);
      }
      acc.get(monthKey)!.push(movement);
      return acc;
    }, new Map<string, Movement[]>())
  ).sort((a, b) => b[0].localeCompare(a[0])); // Sort months descending

  // Sort movements within each month by createdAt
  movementsByMonth.forEach(([, monthMovements]) => {
    monthMovements.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });

  const getMovementTypeColor = (type: MovementType): string => {
    switch (type) {
      case 'IngresoNormal':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'EgresoNormal':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'IngresoFijo':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'EgresoFijo':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700';
      case 'InvestmentIngreso':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'InvestmentShares':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
    }
  };

  const getMovementTypeLabel = (type: MovementType): string => {
    switch (type) {
      case 'IngresoNormal':
        return 'Income';
      case 'EgresoNormal':
        return 'Expense';
      case 'IngresoFijo':
        return 'Fixed Income';
      case 'EgresoFijo':
        return 'Fixed Expense';
      case 'InvestmentIngreso':
        return 'Investment Deposit';
      case 'InvestmentShares':
        return 'Investment Shares';
      default:
        return type;
    }
  };

  const getAccount = (id: string): Account | undefined => {
    return accounts.find((acc) => acc.id === id);
  };

  const getPocket = (id: string): Pocket | undefined => {
    return pockets.find((p) => p.id === id);
  };

  const getSubPocket = (id: string): SubPocket | undefined => {
    return subPockets.find((sp) => sp.id === id);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const type = formData.get('type') as MovementType;
    const accountId = formData.get('accountId') as string;
    const pocketId = formData.get('pocketId') as string;
    const subPocketId = formData.get('subPocketId') as string || undefined;
    const amount = parseFloat(formData.get('amount') as string);
    const notes = formData.get('notes') as string || undefined;
    const displayedDate = formData.get('displayedDate') as string;



    try {
      if (editingMovement) {
        await updateMovement(editingMovement.id, {
          type,
          accountId,
          pocketId,
          subPocketId,
          amount,
          notes,
          displayedDate,
        });
        setEditingMovement(null);
        setShowForm(false);
        setSelectedAccountId('');
        setSelectedPocketId('');
        setIsFixedExpense(false);
      } else {
        // print the pocket for the operation to be done, the id and the name
        console.log('Pocket for the operation to be done:', pocketId, getPocket(pocketId)?.name || 'Unknown');
        await createMovement(type, accountId, pocketId, amount, notes, displayedDate, subPocketId);
        form.reset();
        setShowForm(false);
        setSelectedAccountId('');
        setSelectedPocketId('');
        setIsFixedExpense(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save movement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this movement?')) {
      return;
    }
    setError(null);
    try {
      await deleteMovement(id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete movement');
    }
  };

  const handleEdit = (movement: Movement) => {
    setEditingMovement(movement);
    setSelectedAccountId(movement.accountId);
    const pocket = getPocket(movement.pocketId);
    if (pocket) {
      setSelectedPocketId(movement.pocketId);
      setIsFixedExpense(pocket.type === 'fixed');
    }
    setShowForm(true);
  };

  const selectedAccount = selectedAccountId
    ? accounts.find((acc) => acc.id === selectedAccountId)
    : null;
  const isInvestmentAccount = selectedAccount?.type === 'investment';

  const availablePockets = selectedAccountId
    ? getPocketsByAccount(selectedAccountId)
    : [];
  const fixedPocket = availablePockets.find((p) => p.type === 'fixed');
  const availableSubPockets = fixedPocket && isFixedExpense
    ? getSubPocketsByPocket(fixedPocket.id)
    : [];

  // Movement types depend on account type
  const movementTypes: { value: MovementType; label: string }[] = isInvestmentAccount
    ? [
        { value: 'InvestmentIngreso', label: 'Invest Money' },
        { value: 'InvestmentShares', label: 'Add Shares' },
      ]
    : [
        { value: 'IngresoNormal', label: 'Normal Income' },
        { value: 'EgresoNormal', label: 'Normal Expense' },
        { value: 'IngresoFijo', label: 'Fixed Income' },
        { value: 'EgresoFijo', label: 'Fixed Expense' },
      ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Movements</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingMovement(null);
            setSelectedAccountId('');
            setSelectedPocketId('');
            setIsFixedExpense(false);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          <Plus className="w-5 h-5" />
          New Movement
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Movements List */}
      {movementsByMonth.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          No movements yet. Create your first movement!
        </div>
      ) : (
        <div className="space-y-6">
          {movementsByMonth.map(([monthKey, monthMovements]) => {
            const date = parseISO(`${monthKey}-01`);
            return (
              <div key={monthKey} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  {format(date, 'MMMM yyyy')}
                </h2>
                <div className="space-y-2">
                  {monthMovements.map((movement) => {
                    const account = getAccount(movement.accountId);
                    const pocket = getPocket(movement.pocketId);
                    const subPocket = movement.subPocketId
                      ? getSubPocket(movement.subPocketId)
                      : null;
                    const isIncome =
                      movement.type === 'IngresoNormal' ||
                      movement.type === 'IngresoFijo' ||
                      movement.type === 'InvestmentIngreso';

                    return (
                      <div
                        key={movement.id}
                        className={`p-4 rounded-lg border-2 ${getMovementTypeColor(
                          movement.type
                        )}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {isIncome ? (
                                <ArrowUpCircle className="w-5 h-5" />
                              ) : (
                                <ArrowDownCircle className="w-5 h-5" />
                              )}
                              <span className="font-semibold">
                                {getMovementTypeLabel(movement.type)}
                              </span>
                              <span className="text-sm opacity-75">
                                {format(parseISO(movement.displayedDate), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <div className="text-sm space-y-1">
                              <p>
                                <span className="font-medium">Account:</span> {account?.name || 'Unknown'}
                              </p>
                              <p>
                                <span className="font-medium">Pocket:</span> {pocket?.name || 'Unknown'}
                                {subPocket && ` → ${subPocket.name}`}
                              </p>
                              {movement.notes && (
                                <p>
                                  <span className="font-medium">Notes:</span> {movement.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold">
                              {isIncome ? '+' : '-'}
                              {movement.amount.toLocaleString(undefined, {
                                style: 'currency',
                                currency: account?.currency || 'USD',
                              })}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(movement)}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(movement.id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Movement Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingMovement(null);
          setSelectedAccountId('');
          setSelectedPocketId('');
          setIsFixedExpense(false);
        }}
        title={editingMovement ? 'Edit Movement' : 'New Movement'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Type</label>
            <select
              name="type"
              defaultValue={editingMovement?.type || 'IngresoNormal'}
              onChange={(e) => {
                const type = e.target.value as MovementType;
                if (type === 'IngresoFijo' || type === 'EgresoFijo') {
                  // Auto-select fixed expenses account and pocket
                  const fixedPocket = pockets.find((p) => p.type === 'fixed');
                  if (fixedPocket) {
                    setSelectedAccountId(fixedPocket.accountId);
                    setSelectedPocketId(fixedPocket.id);
                    setIsFixedExpense(true);
                  }
                }
              }}
              required
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {movementTypes.map((mt) => (
                <option key={mt.value} value={mt.value}>
                  {mt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Account</label>
            <select
              name="accountId"
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setSelectedPocketId('');
                setIsFixedExpense(false);
              }}
              required
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency}) {account.type === 'investment' ? '- Investment' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedAccountId && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Pocket</label>
              <select
                name="pocketId"
                value={selectedPocketId}
                onChange={(e) => {
                  const pocket = availablePockets.find((p) => p.id === e.target.value);
                  setSelectedPocketId(e.target.value);
                  setIsFixedExpense(pocket?.type === 'fixed' || false);
                }}
                required
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a pocket</option>
                {availablePockets.map((pocket) => (
                  <option key={pocket.id} value={pocket.id}>
                    {pocket.name} ({pocket.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isFixedExpense && fixedPocket && availableSubPockets.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Sub-Pocket (Fixed Expense)</label>
              <select
                name="subPocketId"
                defaultValue={editingMovement?.subPocketId || ''}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">None</option>
                {availableSubPockets.map((subPocket) => (
                  <option key={subPocket.id} value={subPocket.id}>
                    {subPocket.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Amount</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              defaultValue={editingMovement?.amount || ''}
              required
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Date</label>
            <input
              type="date"
              name="displayedDate"
              defaultValue={
                editingMovement
                  ? format(parseISO(editingMovement.displayedDate), 'yyyy-MM-dd')
                  : format(new Date(), 'yyyy-MM-dd')
              }
              required
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Notes (optional)</label>
            <textarea
              name="notes"
              defaultValue={editingMovement?.notes || ''}
              rows={3}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              {editingMovement ? 'Save Changes' : 'Create Movement'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingMovement(null);
                setSelectedAccountId('');
                setSelectedPocketId('');
                setIsFixedExpense(false);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MovementsPage;
