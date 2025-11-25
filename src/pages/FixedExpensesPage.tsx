import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import type { SubPocket } from '../types';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';

const FixedExpensesPage = () => {
  const {
    accounts,
    pockets,
    loadAccounts,
    loadPockets,
    loadSubPockets,
    createSubPocket,
    updateSubPocket,
    deleteSubPocket,
    toggleSubPocketEnabled,
    getSubPocketsByPocket,
  } = useFinanceStore();

  const toast = useToast();
  const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingSubPocket, setEditingSubPocket] = useState<SubPocket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Button-level loading
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadAccounts(), loadPockets(), loadSubPockets()]);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load fixed expenses data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadAccounts, loadPockets, loadSubPockets, toast]);

  // Find the fixed expenses pocket
  const fixedPocket = pockets.find((p) => p.type === 'fixed');
  const fixedSubPockets = fixedPocket ? getSubPocketsByPocket(fixedPocket.id) : [];
  const fixedAccount = fixedPocket
    ? accounts.find((acc) => acc.id === fixedPocket.accountId)
    : null;

  // Calculate aporteMensual for display
  const calculateAporteMensual = (valueTotal: number, periodicityMonths: number): number => {
    if (periodicityMonths <= 0) return 0;
    return valueTotal / periodicityMonths;
  };

  // Calculate progress percentage
  const calculateProgress = (balance: number, valueTotal: number): number => {
    if (valueTotal <= 0) return 0;
    return Math.min((balance / valueTotal) * 100, 100);
  };

  // Get progress color based on percentage
  const getProgressColor = (progress: number): string => {
    if (progress === 0) return 'bg-red-500';
    if (progress < 50) return 'bg-orange-500';
    if (progress < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true); // Button-level loading only
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get('name') as string;
    const valueTotal = parseFloat(formData.get('valueTotal') as string);
    const periodicityMonths = parseInt(formData.get('periodicityMonths') as string, 10);

    if (!fixedPocket) {
      const errorMsg = 'No fixed expenses pocket found. Please create a fixed expenses pocket first.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsSaving(false);
      return;
    }

    try {
      if (editingSubPocket) {
        // Optimistic: close form immediately, store handles optimistic update
        setEditingSubPocket(null);
        form.reset();
        setShowForm(false);
        
        await updateSubPocket(editingSubPocket.id, {
          name,
          valueTotal,
          periodicityMonths,
        });
        toast.success('Fixed expense updated successfully!');
      } else {
        // Optimistic: close form immediately, store handles optimistic update
        form.reset();
        setShowForm(false);
        
        await createSubPocket(fixedPocket.id, name, valueTotal, periodicityMonths);
        toast.success('Fixed expense created successfully!');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to save fixed expense';
      setError(errorMsg);
      toast.error(errorMsg);
      setShowForm(true); // Reopen on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const subPocket = fixedSubPockets.find(sp => sp.id === id);
    
    const confirmed = await confirm({
      title: 'Delete Fixed Expense',
      message: `Are you sure you want to delete "${subPocket?.name}"? This action cannot be undone.`,
      confirmText: 'Delete Expense',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setError(null);
    setDeletingId(id); // Track which item is being deleted
    try {
      // Optimistic: UI updates immediately via store
      await deleteSubPocket(id);
      toast.success('Fixed expense deleted successfully!');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete fixed expense';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string) => {
    setError(null);
    setTogglingId(id); // Track which item is being toggled
    try {
      // Optimistic: UI updates immediately via store
      await toggleSubPocketEnabled(id);
      toast.success('Fixed expense status updated!');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to toggle fixed expense';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setTogglingId(null);
    }
  };

  // Calculate total monthly fixed expenses using next payment (accounts for negative balances)
  const calculateTotalFijosMes = () => {
    return fixedSubPockets
      .filter((sp) => sp.enabled)
      .reduce((sum, sp) => {
        const aporteMensual = calculateAporteMensual(sp.valueTotal, sp.periodicityMonths);
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

  if (!fixedPocket) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Fixed Expenses</h1>
        <div className="p-8 text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-300 font-medium mb-2">
            No fixed expenses pocket found
          </p>
          <p className="text-yellow-700 dark:text-yellow-400 text-sm">
            Please create a fixed expenses pocket in the Accounts page first.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading fixed expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Fixed Expenses</h1>
          {fixedAccount && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Account: {fixedAccount.name} ({fixedAccount.currency})
            </p>
          )}
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowForm(true);
            setEditingSubPocket(null);
          }}
        >
          <Plus className="w-5 h-5" />
          New Fixed Expense
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Card */}
      <Card padding="md" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">Monthly Fixed Expenses Total</h2>
        <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
          {totalFijosMes.toLocaleString(undefined, {
            style: 'currency',
            currency: fixedAccount?.currency || 'USD',
          })}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          Sum of all enabled fixed expenses monthly contributions
        </p>
      </Card>

      {/* Fixed Expenses Table */}
      {fixedSubPockets.length === 0 ? (
        <Card padding="lg" className="text-center text-gray-500 dark:text-gray-400">
          No fixed expenses yet. Create your first fixed expense!
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Periodicity (Months)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Monthly Contribution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Current Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {fixedSubPockets.map((subPocket) => {
                  const aporteMensual = calculateAporteMensual(
                    subPocket.valueTotal,
                    subPocket.periodicityMonths
                  );
                  const progress = calculateProgress(subPocket.balance, subPocket.valueTotal);

                  return (
                    <tr
                      key={subPocket.id}
                      className={subPocket.enabled ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30' : 'opacity-60 hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(subPocket.id)}
                          loading={togglingId === subPocket.id}
                          disabled={togglingId !== null || deletingId !== null}
                          className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                          title={subPocket.enabled ? 'Disable' : 'Enable'}
                        >
                          {subPocket.enabled ? (
                            <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </Button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{subPocket.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {subPocket.valueTotal.toLocaleString(undefined, {
                            style: 'currency',
                            currency: fixedAccount?.currency || 'USD',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{subPocket.periodicityMonths}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {aporteMensual.toLocaleString(undefined, {
                            style: 'currency',
                            currency: fixedAccount?.currency || 'USD',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${
                            subPocket.balance < 0
                              ? 'text-red-600 dark:text-red-400'
                              : subPocket.balance >= subPocket.valueTotal
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {subPocket.balance.toLocaleString(undefined, {
                            style: 'currency',
                            currency: fixedAccount?.currency || 'USD',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 min-w-[100px]">
                            <div
                              className={`h-2.5 rounded-full transition-all ${getProgressColor(
                                progress
                              )}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[45px]">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSubPocket(subPocket);
                              setShowForm(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(subPocket.id)}
                            loading={deletingId === subPocket.id}
                            disabled={deletingId !== null || togglingId !== null}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingSubPocket(null);
        }}
        title={editingSubPocket ? 'Edit Fixed Expense' : 'New Fixed Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Input
            label="Name"
            name="name"
            type="text"
            defaultValue={editingSubPocket?.name || ''}
            placeholder="e.g., Car payment, Insurance"
            required
          />

          <Input
            label="Total Value"
            name="valueTotal"
            type="number"
            step="0.01"
            min="0"
            defaultValue={editingSubPocket?.valueTotal?.toString() || ''}
            placeholder="Total amount to save/pay"
            helperText="The total amount you need to save or pay for this expense"
            required
          />

          <Input
            label="Periodicity (Months)"
            name="periodicityMonths"
            type="number"
            min="1"
            defaultValue={editingSubPocket?.periodicityMonths?.toString() || ''}
            placeholder="e.g., 12 for monthly over a year"
            helperText="How many months to divide this expense over"
            required
          />

          {editingSubPocket && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Monthly Contribution:</span>{' '}
                {calculateAporteMensual(
                  editingSubPocket.valueTotal,
                  editingSubPocket.periodicityMonths
                ).toLocaleString(undefined, {
                  style: 'currency',
                  currency: fixedAccount?.currency || 'USD',
                })}
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
              {editingSubPocket ? 'Save Changes' : 'Create Fixed Expense'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingSubPocket(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

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

export default FixedExpensesPage;
