import { useState } from 'react';
import {
  useAccountsQuery,
  usePocketsQuery,
  useSubPocketsQuery,
  useFixedExpenseGroupsQuery,
  useMovementMutations,
  useFixedExpenseGroupMutations,
  useSubPocketMutations
} from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import type { SubPocket, FixedExpenseGroup } from '../types';
import { Plus, Receipt, FolderPlus } from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Card from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import BatchMovementForm, { type BatchMovementRow } from '../components/BatchMovementForm';
import FixedExpenseGroupCard from '../components/FixedExpenseGroupCard';
import { FixedExpenseForm, FixedExpenseGroupForm } from '../components/fixed-expenses';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';

const FixedExpensesPage = () => {
  // Queries
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { data: subPockets = [] } = useSubPocketsQuery();
  const { data: fixedExpenseGroups = [], isLoading: groupsLoading } = useFixedExpenseGroupsQuery();

  // Mutations
  const { createMovement } = useMovementMutations();
  const { deleteFixedExpenseGroup, toggleFixedExpenseGroup } = useFixedExpenseGroupMutations();
  const { deleteSubPocket, toggleSubPocketEnabled, moveSubPocketToGroup } = useSubPocketMutations();

  const toast = useToast();
  const { confirm } = useConfirm();

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchMovementRow[]>([]);
  const [editingSubPocket, setEditingSubPocket] = useState<SubPocket | null>(null);
  const [editingGroup, setEditingGroup] = useState<FixedExpenseGroup | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Action tracking state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null);

  // Derived loading state
  const isLoading = groupsLoading;

  // Find the fixed expenses pocket
  const fixedPocket = pockets.find((p) => p.type === 'fixed');
  const fixedSubPockets = fixedPocket ? subPockets.filter(sp => sp.pocketId === fixedPocket.id) : [];
  const fixedAccount = fixedPocket
    ? accounts.find((acc) => acc.id === fixedPocket.accountId)
    : null;

  const handleCreateMovementsFromFixedExpenses = () => {
    if (!fixedAccount || !fixedPocket) {
      toast.error('No fixed expenses account found');
      return;
    }

    const enabledSubPockets = fixedSubPockets.filter(sp => sp.enabled);

    if (enabledSubPockets.length === 0) {
      toast.error('No enabled fixed expenses found');
      return;
    }

    // Create batch rows from enabled sub-pockets
    const rows: BatchMovementRow[] = enabledSubPockets.map(subPocket => ({
      id: crypto.randomUUID(),
      type: 'IngresoFijo' as const, // Fixed Income - money going INTO the fixed expenses pocket
      accountId: fixedAccount.id,
      pocketId: fixedPocket.id,
      subPocketId: subPocket.id,
      amount: (subPocket.valueTotal / subPocket.periodicityMonths).toFixed(2),
      notes: `Monthly contribution for ${subPocket.name}`,
      displayedDate: new Date().toISOString().split('T')[0],
    }));

    setBatchRows(rows);
    setShowBatchForm(true);
    toast.success(`Pre-populated ${rows.length} fixed expenses`);
  };

  const handleBatchSave = async (rows: BatchMovementRow[]) => {
    try {
      // Create all movements
      for (const row of rows) {
        await createMovement.mutateAsync({
          type: row.type,
          accountId: row.accountId,
          pocketId: row.pocketId,
          amount: parseFloat(row.amount),
          notes: row.notes || undefined,
          displayedDate: row.displayedDate,
          subPocketId: row.subPocketId,
          isPending: false // Not pending
        });
      }

      setShowBatchForm(false);
      setBatchRows([]);
      toast.success(`Successfully created ${rows.length} movements!`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save movements';
      toast.error(errorMessage);
      throw err; // Re-throw so form can handle it
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

    setDeletingId(id); // Track which item is being deleted
    try {
      // Optimistic: UI updates immediately via store
      await deleteSubPocket.mutateAsync(id);
      toast.success('Fixed expense deleted successfully!');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete fixed expense';
      toast.error(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id); // Track which item is being toggled
    try {
      // Optimistic: UI updates immediately via store
      await toggleSubPocketEnabled.mutateAsync(id);
      toast.success('Fixed expense status updated!');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to toggle fixed expense';
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

  // Group handlers
  const handleDeleteGroup = async (group: FixedExpenseGroup) => {
    const confirmed = await confirm({
      title: 'Delete Group',
      message: `Are you sure you want to delete "${group.name}"? All expenses will be moved to the Default group.`,
      confirmText: 'Delete Group',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteFixedExpenseGroup.mutateAsync(group.id);
      toast.success('Group deleted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete group');
    }
  };

  const handleToggleGroup = async (groupId: string, enabled: boolean) => {
    setTogglingGroupId(groupId);
    try {
      await toggleFixedExpenseGroup.mutateAsync({ id: groupId, enabled });
      toast.success(`Group ${enabled ? 'enabled' : 'disabled'} successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle group');
    } finally {
      setTogglingGroupId(null);
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (!fixedPocket) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fixed Expenses" />
        <EmptyState
          icon={Receipt}
          title="No fixed expenses pocket found"
          description="Please create a fixed expenses pocket in the Accounts page first."
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <Card>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-9 w-9 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </Card>
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
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleCreateMovementsFromFixedExpenses}
            disabled={fixedSubPockets.filter(sp => sp.enabled).length === 0}
          >
            <Receipt className="w-5 h-5" />
            Create Movements
          </Button>
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
      </div>

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

      {/* Group Management */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Expense Groups</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditingGroup(null);
            setShowGroupForm(true);
          }}
        >
          <FolderPlus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      {/* Fixed Expenses by Group */}
      {fixedSubPockets.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No fixed expenses yet"
          description="Create your first fixed expense to get started!"
        />
      ) : (
        <div className="space-y-4">
          {fixedExpenseGroups.map((group) => {
            const groupExpenses = getSubPocketsByGroup(group.id);
            const isDefaultGroup = group.name === 'Default';
            
            return (
              <FixedExpenseGroupCard
                key={group.id}
                group={group}
                subPockets={groupExpenses}
                allGroups={fixedExpenseGroups}
                currency={fixedAccount?.currency || 'USD'}
                isDefaultGroup={isDefaultGroup}
                isCollapsed={collapsedGroups.has(group.id)}
                isToggling={togglingGroupId === group.id}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
                onToggleGroup={(enabled) => handleToggleGroup(group.id, enabled)}
                onEditGroup={() => {
                  setEditingGroup(group);
                  setShowGroupForm(true);
                }}
                onDeleteGroup={() => handleDeleteGroup(group)}
                onEditExpense={(subPocket) => {
                  setEditingSubPocket(subPocket);
                  setShowForm(true);
                }}
                onDeleteExpense={handleDelete}
                onToggleExpense={handleToggle}
                onMoveToGroup={async (subPocketId, groupId) => {
                  try {
                    await moveSubPocketToGroup.mutateAsync({ subPocketId, groupId });
                    toast.success('Expense moved to new group!');
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to move expense');
                  }
                }}
                deletingId={deletingId}
                togglingId={togglingId}
              />
            );
          })}
        </div>
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
        {fixedAccount && (
          <FixedExpenseForm
            fixedPocketId={fixedPocket.id}
            fixedAccount={fixedAccount}
            initialData={editingSubPocket}
            onClose={() => {
              setShowForm(false);
              setEditingSubPocket(null);
            }}
            onSuccess={() => {
              // Success toast is handled in the form component
            }}
          />
        )}
      </Modal>

      {/* Batch Movement Form Modal */}
      <Modal isOpen={showBatchForm} onClose={() => setShowBatchForm(false)}>
        <BatchMovementForm
          accounts={accounts}
          getPocketsByAccount={(accountId) => pockets.filter(p => p.accountId === accountId)}
          getSubPocketsByPocket={(pocketId) => subPockets.filter(sp => sp.pocketId === pocketId)}
          onSave={handleBatchSave}
          onCancel={() => {
            setShowBatchForm(false);
            setBatchRows([]);
          }}
          initialRows={batchRows}
        />
      </Modal>

      {/* Group Form Modal */}
      <Modal
        isOpen={showGroupForm}
        onClose={() => {
          setShowGroupForm(false);
          setEditingGroup(null);
        }}
      >
        <FixedExpenseGroupForm
          initialData={editingGroup}
          onClose={() => {
            setShowGroupForm(false);
            setEditingGroup(null);
          }}
          onSuccess={() => {
            // Success toast is handled in the form component
          }}
        />
      </Modal>
    </div>
  );
};

export default FixedExpensesPage;
