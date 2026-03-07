import { useState, useMemo } from 'react';
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
import type { Account, SubPocket, FixedExpenseGroup } from '../types';
import { Plus, Receipt, Wallet, Layers, FolderPlus } from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';
import { Skeleton } from '../components/Skeleton';
import BatchMovementForm, { type BatchMovementRow } from '../components/BatchMovementForm';
import FixedExpenseGroupCard from '../components/FixedExpenseGroupCard';
import { FixedExpenseForm, FixedExpenseGroupForm } from '../components/fixed-expenses';
import SortableList from '../components/SortableList';
import SortableItem from '../components/SortableItem';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';
import { FixedExpensesSummary } from '../components/summary';

const FixedExpensesPage = () => {
  // Queries
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { data: subPockets = [] } = useSubPocketsQuery();
  const { data: fixedExpenseGroups = [], isLoading: groupsLoading } = useFixedExpenseGroupsQuery();

  // Mutations
  const { createMovement } = useMovementMutations();
  const { deleteFixedExpenseGroup, toggleFixedExpenseGroup, reorderFixedExpenseGroups } = useFixedExpenseGroupMutations();
  const { deleteSubPocket, toggleSubPocketEnabled, moveSubPocketToGroup } = useSubPocketMutations();

  const toast = useToast();
  const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();

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

  // Find all fixed expenses pockets and accounts
  const fixedPockets = useMemo(() => pockets.filter((p) => p.type === 'fixed'), [pockets]);
  const fixedSubPockets = useMemo(() => 
    subPockets.filter(sp => fixedPockets.some(fp => fp.id === sp.pocketId)),
    [subPockets, fixedPockets]
  );
  
  // Create a map of pocketId to account for quick lookup
  const pocketAccountMap = useMemo(() => {
    const map = new Map<string, Account>();
    fixedPockets.forEach(fp => {
      const account = accounts.find(a => a.id === fp.accountId);
      if (account) map.set(fp.id, account);
    });
    return map;
  }, [fixedPockets, accounts]);

  // Representative currency for the global summary
  const summaryCurrency = fixedPockets[0]?.currency || 'USD';

  // Helper function to get sub-pockets for a specific group
  const getSubPocketsByGroup = (groupId: string) => {
    return fixedSubPockets.filter(sp => sp.groupId === groupId);
  };


  const handleCreateMovementsFromFixedExpenses = () => {
    if (fixedPockets.length === 0) {
      toast.error('No fixed expenses accounts found');
      return;
    }

    const enabledSubPockets = fixedSubPockets.filter(sp => sp.enabled);

    if (enabledSubPockets.length === 0) {
      toast.error('No enabled fixed expenses found');
      return;
    }

    // Create batch rows from enabled sub-pockets
    const rows: BatchMovementRow[] = enabledSubPockets.map(subPocket => {
      const parentPocket = fixedPockets.find(fp => fp.id === subPocket.pocketId);
      const parentAccount = parentPocket ? accounts.find(a => a.id === parentPocket.accountId) : null;
      
      return {
        id: crypto.randomUUID(),
        type: 'IngresoFijo' as const, // Fixed Income - money going INTO the fixed expenses pocket
        accountId: parentAccount?.id || '',
        pocketId: subPocket.pocketId,
        subPocketId: subPocket.id,
        amount: calculateAporteMensual(subPocket.valueTotal, subPocket.periodicityMonths, subPocket.balance).toFixed(2),
        notes: `Monthly contribution for ${subPocket.name}`,
        displayedDate: new Date().toISOString().split('T')[0],
      };
    });

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
          isPending: row.isPending || false
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
    console.log('🚀 handleDelete called with id:', id);
    const subPocket = fixedSubPockets.find(sp => sp.id === id);
    console.log('📦 Found subPocket:', subPocket);

    const confirmed = await confirm({
      title: 'Delete Fixed Expense',
      message: `Are you sure you want to delete "${subPocket?.name}"? This action cannot be undone.`,
      confirmText: 'Delete Expense',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    console.log('✅ Confirmation result:', confirmed);
    if (!confirmed) return;

    setDeletingId(id); // Track which item is being deleted
    try {
      console.log('🔄 Calling deleteSubPocket.mutateAsync...');
      // Optimistic: UI updates immediately via store
      await deleteSubPocket.mutateAsync(id);
      console.log('✅ Delete successful');
      toast.success('Fixed expense deleted successfully!');
    } catch (err: any) {
      console.error('❌ Delete failed:', err);
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
      .filter((sp: SubPocket) => sp.enabled)
      .reduce((sum: number, sp: SubPocket) => {
        const aporteMensual = calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance);

        // Case 1: Negative balance - compensate + normal payment
        if (sp.balance < 0) {
          return sum + aporteMensual + Math.abs(sp.balance);
        }

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

  const handleReorder = async (items: FixedExpenseGroup[]) => {
    const ids = items.map(item => item.id);
    try {
      // Optimistic update is handled by the SortableList component's state
      // We just need to persist the new order
      await reorderFixedExpenseGroups.mutateAsync(ids);
    } catch (err: any) {
      toast.error('Failed to reorder groups');
    }
  };

  // Find all fixed expenses pockets
  const consolidatedFixedPockets = pockets.filter((p) => p.type === 'fixed');
  const consolidatedFixedSubPockets = subPockets.filter(sp => consolidatedFixedPockets.some(fp => fp.id === sp.pocketId));
  
  // Calculate total money in fixed expenses (simple sum for now)
  const totalFixedExpensesMoney = consolidatedFixedSubPockets.reduce(
    (sum, sp) => sum + sp.balance,
    0
  );

  if (fixedPockets.length === 0) {
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
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Managing {fixedPockets.length} fixed expense {fixedPockets.length === 1 ? 'pocket' : 'pockets'}
          </p>
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
            currency: summaryCurrency,
          })}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          Sum of all enabled fixed expenses monthly contributions
        </p>
      </Card>

      {/* Fixed Expenses Section */}
      <div className="space-y-4">
        {consolidatedFixedPockets.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No fixed expenses pocket"
            description="Create a fixed expenses pocket to track your recurring bills."
          />
        ) : (
          <FixedExpensesSummary
            subPockets={consolidatedFixedSubPockets}
            groups={fixedExpenseGroups}
            accounts={accounts}
            pockets={pockets}
            totalMoney={totalFixedExpensesMoney}
            primaryCurrency={summaryCurrency}
          />
        )}
      </div>

      {/* Group Management */}
      <div className="flex items-center justify-between pt-6 border-t dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          Expense Groups
        </h2>
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
          <SortableList
            items={fixedExpenseGroups}
            getId={(item) => item.id}
            onReorder={handleReorder}
            renderItem={(group) => {
              const groupExpenses = getSubPocketsByGroup(group.id);
              const isDefaultGroup = group.name === 'Default';

              return (
                <SortableItem key={group.id} id={group.id}>
                  <FixedExpenseGroupCard
                    group={group}
                    subPockets={groupExpenses}
                    allGroups={fixedExpenseGroups}
                    currency={summaryCurrency}
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
                    pocketAccountMap={pocketAccountMap}
                  />
                </SortableItem>
               );
            }}
          />
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
        size="lg"
      >
        {fixedPockets.length > 0 && (
          <FixedExpenseForm
            fixedPockets={fixedPockets}
            accounts={accounts}
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
      <Modal isOpen={showBatchForm} onClose={() => setShowBatchForm(false)} size="xl">
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

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </div>
  );
};

export default FixedExpensesPage;
