import { useCallback, useMemo, useState } from 'react';
import { FolderPlus, Layers, Receipt, Wallet } from 'lucide-react';
import {
  useAccountsQuery,
  useFixedExpenseGroupMutations,
  useFixedExpenseGroupsQuery,
  useMovementMutations,
  usePocketsQuery,
  useSubPocketMutations,
  useSubPocketsQuery,
} from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { useFixedExpenseActions } from '../hooks/useFixedExpenseActions';
import type { Account, FixedExpenseGroup, SubPocket } from '../types';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';
import BatchMovementForm from '../components/BatchMovementForm';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { Skeleton } from '../components/Skeleton';
import {
  FixedExpenseForm,
  FixedExpenseGroupForm,
  FixedExpensesHeader,
  FixedExpensesList,
} from '../components/fixed-expenses';
import { FixedExpensesSummary } from '../components/summary';

const FixedExpensesPage = () => {
  // Data
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { data: subPockets = [] } = useSubPocketsQuery();
  const { data: fixedExpenseGroups = [], isLoading: groupsLoading } =
    useFixedExpenseGroupsQuery();

  // Mutations
  const movementMutations = useMovementMutations();
  const groupMutations = useFixedExpenseGroupMutations();
  const subPocketMutations = useSubPocketMutations();

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  // Modal state — page owns it so the form components can be wired below.
  const [showForm, setShowForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingSubPocket, setEditingSubPocket] = useState<SubPocket | null>(null);
  const [editingGroup, setEditingGroup] = useState<FixedExpenseGroup | null>(null);

  // Derived data
  const fixedPockets = useMemo(
    () => pockets.filter((p) => p.type === 'fixed'),
    [pockets]
  );
  const fixedSubPockets = useMemo(
    () => subPockets.filter((sp) => fixedPockets.some((fp) => fp.id === sp.pocketId)),
    [subPockets, fixedPockets]
  );
  const pocketAccountMap = useMemo(() => {
    const map = new Map<string, Account>();
    fixedPockets.forEach((fp) => {
      const account = accounts.find((a) => a.id === fp.accountId);
      if (account) map.set(fp.id, account);
    });
    return map;
  }, [fixedPockets, accounts]);

  const summaryCurrency = fixedPockets[0]?.currency || 'USD';
  const enabledCount = fixedSubPockets.filter((sp) => sp.enabled).length;

  const totalFijosMes = useMemo(
    () =>
      fixedSubPockets
        .filter((sp) => sp.enabled)
        .reduce((sum, sp) => {
          const monthly = calculateAporteMensual(
            sp.valueTotal,
            sp.periodicityMonths,
            sp.balance
          );
          // Negative balance: compensate the deficit + the normal monthly payment.
          if (sp.balance < 0) {
            return sum + monthly + Math.abs(sp.balance);
          }
          return sum + monthly;
        }, 0),
    [fixedSubPockets]
  );
  const totalFixedExpensesMoney = useMemo(
    () => fixedSubPockets.reduce((sum, sp) => sum + sp.balance, 0),
    [fixedSubPockets]
  );

  const actions = useFixedExpenseActions({
    accounts,
    fixedPockets,
    fixedSubPockets,
    movementMutations,
    groupMutations,
    subPocketMutations,
    toast,
    confirm,
  });

  // Stable handlers passed to memoized FixedExpenseGroupCard via the list.
  const handleEditGroup = useCallback((group: FixedExpenseGroup) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  }, []);
  const handleEditExpense = useCallback((sp: SubPocket) => {
    setEditingSubPocket(sp);
    setShowForm(true);
  }, []);
  const handleDeleteGroup = useCallback(
    (group: FixedExpenseGroup) => {
      void actions.handleDeleteGroup(group);
    },
    [actions]
  );
  const handleDeleteExpense = useCallback(
    (id: string) => {
      void actions.handleDeleteSubPocket(id);
    },
    [actions]
  );
  const handleToggleExpense = useCallback(
    (id: string) => {
      void actions.handleToggleSubPocket(id);
    },
    [actions]
  );
  const handleMoveToGroup = useCallback(
    (subPocketId: string, groupId: string) => {
      void actions.handleMoveToGroup(subPocketId, groupId);
    },
    [actions]
  );
  const handleToggleGroup = useCallback(
    (groupId: string, enabled: boolean) => {
      void actions.handleToggleGroup(groupId, enabled);
    },
    [actions]
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

  if (groupsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64 mb-2" />
        <Card>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FixedExpensesHeader
        pocketCount={fixedPockets.length}
        enabledExpenseCount={enabledCount}
        totalMonthly={totalFijosMes}
        currency={summaryCurrency}
        onCreateMovements={actions.prepareBatchFromEnabled}
        onNewExpense={() => {
          setEditingSubPocket(null);
          setShowForm(true);
        }}
      />

      <div className="space-y-4">
        {fixedPockets.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No fixed expenses pocket"
            description="Create a fixed expenses pocket to track your recurring bills."
          />
        ) : (
          <FixedExpensesSummary
            subPockets={fixedSubPockets}
            groups={fixedExpenseGroups}
            accounts={accounts}
            pockets={pockets}
            totalMoney={totalFixedExpensesMoney}
            primaryCurrency={summaryCurrency}
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-6 border-t dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" aria-hidden="true" />
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
          <FolderPlus className="w-4 h-4" aria-hidden="true" />
          New Group
        </Button>
      </div>

      <FixedExpensesList
        groups={fixedExpenseGroups}
        fixedSubPockets={fixedSubPockets}
        pocketAccountMap={pocketAccountMap}
        currency={summaryCurrency}
        collapsedGroups={actions.collapsedGroups}
        togglingGroupId={actions.togglingGroupId}
        deletingId={actions.deletingId}
        togglingId={actions.togglingId}
        onReorderGroups={actions.handleReorderGroups}
        onToggleCollapse={actions.toggleGroupCollapse}
        onToggleGroup={handleToggleGroup}
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
        onToggleExpense={handleToggleExpense}
        onMoveToGroup={handleMoveToGroup}
      />

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingSubPocket(null);
        }}
        title={editingSubPocket ? 'Edit Fixed Expense' : 'New Fixed Expense'}
        size="lg"
      >
        <FixedExpenseForm
          fixedPockets={fixedPockets}
          accounts={accounts}
          initialData={editingSubPocket}
          onClose={() => {
            setShowForm(false);
            setEditingSubPocket(null);
          }}
          onSuccess={() => undefined}
        />
      </Modal>

      <Modal isOpen={actions.batchForm.isOpen} onClose={actions.batchForm.close} size="xl">
        <BatchMovementForm
          accounts={accounts}
          getPocketsByAccount={(accountId) =>
            pockets.filter((p) => p.accountId === accountId)
          }
          getSubPocketsByPocket={(pocketId) =>
            subPockets.filter((sp) => sp.pocketId === pocketId)
          }
          onSave={actions.batchForm.save}
          onCancel={actions.batchForm.close}
          initialRows={actions.batchForm.rows}
        />
      </Modal>

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
          onSuccess={() => undefined}
        />
      </Modal>
    </div>
  );
};

export default FixedExpensesPage;
