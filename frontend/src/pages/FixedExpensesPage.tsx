import { useCallback, useMemo, useState } from 'react';
import { Receipt, Wallet } from 'lucide-react';
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
import { useFixedExpenseActions } from '../hooks/actions/useFixedExpenseActions';
import type { Account, FixedExpenseGroup, SubPocket } from '../types';
import { calculateAporteMensual, calculateSimpleMonthlyContribution } from '../utils/fixedExpenseUtils';
import BatchMovementForm from '../components/movements/BatchMovementForm';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import {
  FixedExpenseForm,
  FixedExpenseGroupForm,
  FixedExpensesHeader,
  FixedExpensesList,
} from '../components/fixed-expenses';

const FixedExpensesPage = () => {
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { data: subPockets = [] } = useSubPocketsQuery();
  const { data: fixedExpenseGroups = [], isLoading: groupsLoading } =
    useFixedExpenseGroupsQuery();

  const movementMutations = useMovementMutations();
  const groupMutations = useFixedExpenseGroupMutations();
  const subPocketMutations = useSubPocketMutations();

  const toast = useToast();
  const { confirm } = useConfirmDialog();

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

  const totalMonthly = useMemo(
    () =>
      fixedSubPockets
        .filter((sp) => sp.enabled)
        .reduce((sum, sp) => sum + calculateSimpleMonthlyContribution(sp.valueTotal, sp.periodicityMonths), 0),
    [fixedSubPockets]
  );

  const totalCommitted = useMemo(
    () =>
      fixedSubPockets
        .filter((sp) => sp.enabled)
        .reduce((sum, sp) => sum + calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance), 0),
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

  const handleEditGroup = useCallback((group: FixedExpenseGroup) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  }, []);
  const handleEditExpense = useCallback((sp: SubPocket) => {
    setEditingSubPocket(sp);
    setShowForm(true);
  }, []);
  const handleDeleteGroup = useCallback(
    (group: FixedExpenseGroup) => { void actions.handleDeleteGroup(group); },
    [actions]
  );
  const handleDeleteExpense = useCallback(
    (id: string) => { void actions.handleDeleteSubPocket(id); },
    [actions]
  );
  const handleToggleExpense = useCallback(
    (id: string) => { void actions.handleToggleSubPocket(id); },
    [actions]
  );
  const handleMoveToGroup = useCallback(
    (subPocketId: string, groupId: string) => { void actions.handleMoveToGroup(subPocketId, groupId); },
    [actions]
  );
  const handleToggleGroup = useCallback(
    (groupId: string, enabled: boolean) => { void actions.handleToggleGroup(groupId, enabled); },
    [actions]
  );

  if (fixedPockets.length === 0) {
    return (
      <div className="space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FixedExpensesHeader
        totalMonthly={totalMonthly}
        totalCommitted={totalCommitted}
        currency={summaryCurrency}
        onAddGroup={() => {
          setEditingGroup(null);
          setShowGroupForm(true);
        }}
        onAddExpense={() => {
          setEditingSubPocket(null);
          setShowForm(true);
        }}
      />

      <button
        onClick={actions.prepareBatchFromEnabled}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        <Wallet className="w-4 h-4" />
        Generate Movements
      </button>

      <FixedExpensesList
        groups={fixedExpenseGroups}
        fixedSubPockets={fixedSubPockets}
        pocketAccountMap={pocketAccountMap}
        currency={summaryCurrency}
        deletingId={actions.deletingId}
        togglingId={actions.togglingId}
        togglingGroupId={actions.togglingGroupId}
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
        onToggleExpense={handleToggleExpense}
        onToggleGroup={handleToggleGroup}
        onMoveToGroup={handleMoveToGroup}
      />

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingSubPocket(null); }}
        title={editingSubPocket ? 'Edit Fixed Expense' : 'New Fixed Expense'}
        size="lg"
      >
        <FixedExpenseForm
          fixedPockets={fixedPockets}
          accounts={accounts}
          initialData={editingSubPocket}
          onClose={() => { setShowForm(false); setEditingSubPocket(null); }}
          onSuccess={() => undefined}
        />
      </Modal>

      <Modal isOpen={actions.batchForm.isOpen} onClose={actions.batchForm.close} size="xl">
        <BatchMovementForm
          onSave={actions.batchForm.save}
          onCancel={actions.batchForm.close}
          initialRows={actions.batchForm.rows}
        />
      </Modal>

      <Modal
        isOpen={showGroupForm}
        onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
      >
        <FixedExpenseGroupForm
          initialData={editingGroup}
          onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
          onSuccess={() => undefined}
        />
      </Modal>
    </div>
  );
};

export default FixedExpensesPage;
