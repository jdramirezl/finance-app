import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { StorageService } from '../services/storageService';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

interface DistributionEntry {
  id: string;
  name: string;
  percentage: number;
}

const BudgetPlanningPage = () => {
  const {
    accounts,
    pockets,
    loadAccounts,
    loadPockets,
    loadSubPockets,
    getSubPocketsByPocket,
  } = useFinanceStore();

  // Load persisted data on mount
  const savedData = StorageService.getBudgetPlanning();
  const [initialAmount, setInitialAmount] = useState<number>(savedData.initialAmount || 0);
  const [distributionEntries, setDistributionEntries] = useState<DistributionEntry[]>(
    savedData.distributionEntries || []
  );
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryName, setEditingEntryName] = useState<string>('');
  const [editingEntryPercentage, setEditingEntryPercentage] = useState<number>(0);

  useEffect(() => {
    loadAccounts();
    loadPockets();
    loadSubPockets();
  }, [loadAccounts, loadPockets, loadSubPockets]);

  // Persist data whenever it changes
  useEffect(() => {
    StorageService.saveBudgetPlanning({
      initialAmount,
      distributionEntries,
    });
  }, [initialAmount, distributionEntries]);

  // Find fixed expenses pocket and calculate total monthly fixed expenses
  const fixedPocket = pockets.find((p) => p.type === 'fixed');
  const fixedSubPockets = fixedPocket ? getSubPocketsByPocket(fixedPocket.id) : [];
  const fixedAccount = fixedPocket
    ? accounts.find((acc) => acc.id === fixedPocket.accountId)
    : null;

  // Calculate total monthly fixed expenses (using next payment logic for negative balances)
  const calculateTotalFijosMes = (): number => {
    return fixedSubPockets
      .filter((sp) => sp.enabled)
      .reduce((sum, sp) => {
        const aporteMensual = sp.valueTotal / sp.periodicityMonths;
        const remaining = sp.valueTotal - sp.balance;

        // Case 1: Negative balance - compensate + normal payment
        if (sp.balance < 0) {
          return sum + aporteMensual + Math.abs(sp.balance);
        }

        // Case 2: Near completion - min of remaining or normal payment
        if (remaining < aporteMensual) {
          return sum + remaining;
        }

        // Normal case
        return sum + aporteMensual;
      }, 0);
  };

  const totalFijosMes = calculateTotalFijosMes();
  const remaining = initialAmount - totalFijosMes;
  const totalPercentage = distributionEntries.reduce((sum, entry) => sum + entry.percentage, 0);

  // Calculate amount for each distribution entry
  const calculateEntryAmount = (percentage: number): number => {
    if (remaining <= 0) return 0;
    return (remaining * percentage) / 100;
  };

  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleAddEntry = () => {
    const newEntry: DistributionEntry = {
      id: generateId(),
      name: '',
      percentage: 0,
    };
    setDistributionEntries([...distributionEntries, newEntry]);
    setEditingEntryId(newEntry.id);
    setEditingEntryName('');
    setEditingEntryPercentage(0);
  };

  const handleSaveEntry = (id: string) => {
    if (!editingEntryName.trim()) {
      alert('Please enter a name for this entry');
      return;
    }

    if (editingEntryPercentage < 0 || editingEntryPercentage > 100) {
      alert('Percentage must be between 0 and 100');
      return;
    }

    setDistributionEntries(
      distributionEntries.map((entry) =>
        entry.id === id
          ? { ...entry, name: editingEntryName, percentage: editingEntryPercentage }
          : entry
      )
    );
    setEditingEntryId(null);
    setEditingEntryName('');
    setEditingEntryPercentage(0);
  };

  const handleDeleteEntry = (id: string) => {
    setDistributionEntries(distributionEntries.filter((entry) => entry.id !== id));
    if (editingEntryId === id) {
      setEditingEntryId(null);
      setEditingEntryName('');
      setEditingEntryPercentage(0);
    }
  };

  const handleStartEdit = (entry: DistributionEntry) => {
    setEditingEntryId(entry.id);
    setEditingEntryName(entry.name);
    setEditingEntryPercentage(entry.percentage);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditingEntryName('');
    setEditingEntryPercentage(0);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Budget Planning</h1>

      {/* Initial Amount Input */}
      <Card padding="md">
        <Input
          label="Initial Amount"
          type="number"
          step="0.01"
          min="0"
          value={initialAmount || ''}
          onChange={(e) => setInitialAmount(parseFloat(e.target.value) || 0)}
          placeholder="Enter your total amount (e.g., salary)"
          helperText="Typically your monthly income or the amount you want to distribute"
          className="text-lg font-semibold"
        />
      </Card>

      {/* Calculation Summary */}
      {initialAmount > 0 && (
        <Card padding="md" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Initial Amount:</span>
            <span className="text-xl font-bold text-blue-900 dark:text-blue-200">
              {initialAmount.toLocaleString(undefined, {
                style: 'currency',
                currency: fixedAccount?.currency || 'USD',
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Fixed Expenses:</span>
            <span className="text-lg font-semibold text-blue-800 dark:text-blue-300">
              - {totalFijosMes.toLocaleString(undefined, {
                style: 'currency',
                currency: fixedAccount?.currency || 'USD',
              })}
            </span>
          </div>
          <div className="border-t border-blue-300 dark:border-blue-700 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-800 dark:text-gray-200 font-bold text-lg">Remaining:</span>
              <span
                className={`text-2xl font-bold ${
                  remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}
              >
                {remaining.toLocaleString(undefined, {
                  style: 'currency',
                  currency: fixedAccount?.currency || 'USD',
                })}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Distribution Grid */}
      {remaining > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Distribution</h2>
            <Button
              variant="primary"
              onClick={handleAddEntry}
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>

          {distributionEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed dark:border-gray-700 rounded-lg">
              No distribution entries yet. Click "Add Entry" to start planning your budget.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 pb-2 border-b dark:border-gray-700 font-semibold text-sm text-gray-600 dark:text-gray-400">
                <div className="col-span-4">Name</div>
                <div className="col-span-3">Percentage</div>
                <div className="col-span-3">Amount</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Entries */}
              {distributionEntries.map((entry) => {
                const isEditing = editingEntryId === entry.id;
                const amount = calculateEntryAmount(entry.percentage);

                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-12 gap-4 items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {isEditing ? (
                      <>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={editingEntryName}
                            onChange={(e) => setEditingEntryName(e.target.value)}
                            placeholder="Entry name"
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={editingEntryPercentage || ''}
                            onChange={(e) =>
                              setEditingEntryPercentage(parseFloat(e.target.value) || 0)
                            }
                            placeholder="%"
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {amount.toLocaleString(undefined, {
                              style: 'currency',
                              currency: fixedAccount?.currency || 'USD',
                            })}
                          </div>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveEntry(entry.id)}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                            title="Save"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-4 font-medium text-gray-900 dark:text-gray-100">
                          {entry.name || <span className="text-gray-400 dark:text-gray-500 italic">Unnamed</span>}
                        </div>
                        <div className="col-span-3 text-gray-700 dark:text-gray-300">{entry.percentage}%</div>
                        <div className="col-span-3 font-semibold text-gray-900 dark:text-gray-100">
                          {amount.toLocaleString(undefined, {
                            style: 'currency',
                            currency: fixedAccount?.currency || 'USD',
                          })}
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(entry)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Total Percentage Warning */}
              {totalPercentage !== 100 && distributionEntries.length > 0 && (
                <div
                  className={`mt-4 p-3 rounded-lg ${
                    totalPercentage > 100
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'
                  }`}
                >
                  <p className="text-sm font-medium">
                    Total percentage: {totalPercentage.toFixed(1)}%
                    {totalPercentage > 100 && ' (exceeds 100%)'}
                    {totalPercentage < 100 && ` (${(100 - totalPercentage).toFixed(1)}% unallocated)`}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Warning if no fixed expenses pocket */}
      {!fixedPocket && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm">
            No fixed expenses pocket found. Create one in the Accounts page to see fixed expenses
            deductions here.
          </p>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanningPage;
