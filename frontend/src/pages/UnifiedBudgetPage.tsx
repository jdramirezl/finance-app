import { useCallback, useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import {
  useAccountsQuery,
  useFixedExpenseGroupMutations,
  useFixedExpenseGroupsQuery,
  useMovementMutations,
  usePocketsQuery,
  useSettingsQuery,
  useSubPocketMutations,
  useSubPocketsQuery,
} from '../hooks/queries';
import { useBudgetActions } from '../hooks/actions/useBudgetActions';
import { useFixedExpenseActions } from '../hooks/actions/useFixedExpenseActions';
import { useBudgetPersistence } from '../hooks/useBudgetPersistence';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import type {
  Currency,
  FixedExpenseGroup,
  SubPocket,
} from '../types';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';
import BatchMovementForm from '../components/movements/BatchMovementForm';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton, SkeletonCard, SkeletonList } from '../components/ui/Skeleton';
import AllocationStrategy, {
  ALLOCATION_COLORS,
} from '../components/budget/AllocationStrategy';
import {
  BudgetCurrencySelector,
  BudgetIncomeCard,
  BudgetScenarioTabs,
  DistributionFooter,
  DistributionHeader,
  ObligationsFooter,
  ObligationsHeader,
  PortfolioDonutChart,
} from '../components/budget';
import {
  FixedExpenseForm,
  FixedExpenseGroupForm,
  StitchExpensesList,
} from '../components/fixed-expenses';
import ScenarioForm, {
  type PlanningScenario,
} from '../components/budget/ScenarioForm';

/**
 * Unified Budget page — split-panel layout that replaces the separate
 * `BudgetPlanningPage` and `FixedExpensesPage`.
 *
 * Left panel (45%) shows fixed obligations: monthly income input, the
 * fixed-expense deduction summary, and the sortable list of expense
 * groups. Right panel (55%) shows the distribution side: the remainder
 * available to distribute, scenario tabs, allocation entries, and the
 * portfolio donut chart.
 *
 * Both panels read shared persistence (income, scenarios, distribution
 * entries) and a shared currency. The page stitches the
 * `useFixedExpenseActions`, `useBudgetActions`, and `useBudgetPersistence`
 * hooks together; the panel components themselves are presentational.
 */
const UnifiedBudgetPage = () => {
  // --- Data ---------------------------------------------------------------
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { data: subPockets = [] } = useSubPocketsQuery();
  const { data: fixedExpenseGroups = [], isLoading: groupsLoading } =
    useFixedExpenseGroupsQuery();
  const {
    data: settings = { primaryCurrency: 'USD' as Currency },
    isLoading: settingsLoading,
  } = useSettingsQuery();

  // --- Mutations + side-effects ------------------------------------------
  const movementMutations = useMovementMutations();
  const groupMutations = useFixedExpenseGroupMutations();
  const subPocketMutations = useSubPocketMutations();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  // --- Persistent UI state (localStorage-backed) -------------------------
  const {
    initialAmount,
    setInitialAmount,
    distributionEntries,
    setDistributionEntries,
    scenarios,
    setScenarios,
    defaultAccountId,
    defaultPocketId,
    budgetCurrency: persistedBudgetCurrency,
    setBudgetCurrency,
  } = useBudgetPersistence();

  // --- Modal state owned by the page ------------------------------------
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [editingSubPocket, setEditingSubPocket] = useState<SubPocket | null>(
    null,
  );
  const [editingGroup, setEditingGroup] = useState<FixedExpenseGroup | null>(
    null,
  );
  const [editingScenario, setEditingScenario] = useState<PlanningScenario | null>(
    null,
  );

  // --- Derived data -------------------------------------------------------
  const fixedPockets = useMemo(
    () => pockets.filter((p) => p.type === 'fixed'),
    [pockets],
  );
  const fixedSubPockets = useMemo(
    () => subPockets.filter((sp) => fixedPockets.some((fp) => fp.id === sp.pocketId)),
    [subPockets, fixedPockets],
  );

  const primaryCurrency = settings?.primaryCurrency || 'USD';
  const budgetCurrency = (persistedBudgetCurrency || fixedPockets[0]?.currency || primaryCurrency) as Currency;

  const totalCount = fixedSubPockets.length;

  // The aggregated left-panel total, kept in sync with the legacy page so
  // the deduction shown matches the user's intuition (negative-balance
  // expenses pre-pay the deficit + the next monthly contribution).
  const totalFixedExpensesMonthly = useMemo(
    () =>
      fixedSubPockets.reduce((sum, sp) => {
        const monthly = calculateAporteMensual(
          sp.valueTotal,
          sp.periodicityMonths,
          sp.balance,
        );
        if (sp.balance < 0) {
          return sum + monthly + Math.abs(sp.balance);
        }
        return sum + monthly;
      }, 0),
    [fixedSubPockets],
  );

  // --- Action hooks ------------------------------------------------------
  const fixedExpenseActions = useFixedExpenseActions({
    accounts,
    fixedPockets,
    fixedSubPockets,
    movementMutations,
    groupMutations,
    subPocketMutations,
    toast,
    confirm,
  });

  const budgetActions = useBudgetActions({
    accounts,
    pockets,
    fixedSubPockets,
    initialAmount,
    distributionEntries,
    scenarios,
    setScenarios,
    budgetCurrency,
    primaryCurrency,
    movementMutations,
    toast,
    defaultAccountId,
    defaultPocketId,
  });

  // Stable action handlers passed into memoized StitchExpensesList children.
  const handleEditGroup = useCallback((group: FixedExpenseGroup) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  }, []);
  const handleEditExpense = useCallback((sp: SubPocket) => {
    setEditingSubPocket(sp);
    setShowExpenseForm(true);
  }, []);
  const handleDeleteGroup = useCallback(
    (group: FixedExpenseGroup) => {
      void fixedExpenseActions.handleDeleteGroup(group);
    },
    [fixedExpenseActions],
  );
  const handleDeleteExpense = useCallback(
    (sp: SubPocket) => {
      void fixedExpenseActions.handleDeleteSubPocket(sp.id);
    },
    [fixedExpenseActions],
  );
  const handleMoveToGroup = useCallback(
    (sp: SubPocket, targetGroupId: string | null) => {
      // Fire-and-forget: the mutation invalidates the subPockets query on
      // success and surfaces failures via its onError toast.
      subPocketMutations.moveSubPocketToGroup.mutate({
        subPocketId: sp.id,
        groupId: targetGroupId,
      });
    },
    [subPocketMutations.moveSubPocketToGroup],
  );

  const closeScenarioForm = () => {
    setShowScenarioForm(false);
    setEditingScenario(null);
  };

  const handleSaveScenario = (scenario: PlanningScenario) => {
    budgetActions.saveScenario(scenario);
    closeScenarioForm();
  };

  const totalPercentage = useMemo(
    () => distributionEntries.reduce((sum, e) => sum + e.percentage, 0),
    [distributionEntries],
  );

  // --- Loading branch ----------------------------------------------------
  if (settingsLoading || groupsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[45%] space-y-4">
            <SkeletonCard />
            <SkeletonList items={4} />
          </div>
          <div className="w-full lg:w-[55%] space-y-4">
            <SkeletonCard />
            <SkeletonList items={4} />
          </div>
        </div>
      </div>
    );
  }

  // --- Empty state branch (no fixed pocket exists) -----------------------
  if (fixedPockets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Budget" />
        <EmptyState
          icon={Receipt}
          title="No fixed expenses pocket found"
          description="Create one in the Accounts page to start planning your budget."
        />
      </div>
    );
  }

  // --- Render -----------------------------------------------------------
  const activeScenarioIdsArray = Array.from(budgetActions.activeScenarioIds);
  const generateDisabled =
    distributionEntries.length === 0 || budgetActions.remaining <= 0;
  const hasChanges = distributionEntries.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Budget" />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-0 lg:h-[calc(100vh-theme(spacing.32))] overflow-hidden">
        {/* LEFT PANEL — 45% */}
        <section
          aria-label="Fixed Obligations"
          className="w-full lg:w-[45%] flex flex-col lg:overflow-hidden lg:border-r border-gray-700"
        >
          <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 p-4">
            <ObligationsHeader
              totalCount={totalCount}
              totalMonthly={totalFixedExpensesMonthly}
              currency={budgetCurrency}
            />
            <div className="mt-3">
              <BudgetCurrencySelector
                value={persistedBudgetCurrency}
                onChange={setBudgetCurrency}
                inferredCurrency={(fixedPockets[0]?.currency || primaryCurrency) as string}
              />
            </div>
          </div>

          <div className="flex-1 lg:overflow-y-auto p-4 space-y-4">
            <BudgetIncomeCard
              initialAmount={initialAmount}
              onAmountChange={setInitialAmount}
              totalFixedExpenses={budgetActions.totalFijosMes}
              currency={budgetCurrency}
            />

            <StitchExpensesList
              groups={fixedExpenseGroups}
              fixedSubPockets={fixedSubPockets}
              currency={budgetCurrency}
              collapsedGroups={fixedExpenseActions.collapsedGroups}
              deletingId={fixedExpenseActions.deletingId}
              onToggleCollapse={fixedExpenseActions.toggleGroupCollapse}
              onEditGroup={handleEditGroup}
              onDeleteGroup={handleDeleteGroup}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onMoveToGroup={handleMoveToGroup}
            />
          </div>

          <ObligationsFooter
            onAddGroup={() => {
              setEditingGroup(null);
              setShowGroupForm(true);
            }}
            onAddExpense={() => {
              setEditingSubPocket(null);
              setShowExpenseForm(true);
            }}
            onBulkGenerate={fixedExpenseActions.prepareBatchFromEnabled}
            bulkDisabled={fixedSubPockets.length === 0}
          />
        </section>

        {/* RIGHT PANEL — 55% */}
        <section
          aria-label="Distribution"
          className="w-full lg:w-[55%] flex flex-col lg:overflow-hidden"
        >
          <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 p-4">
            <DistributionHeader
              distributable={budgetActions.remaining}
              currency={budgetCurrency}
              totalPercentage={totalPercentage}
              primaryCurrency={primaryCurrency}
              convertedDistributable={budgetActions.convertedRemaining}
            />
          </div>

          <div className="flex-1 lg:overflow-y-auto p-4 space-y-4">
            <BudgetScenarioTabs
              scenarios={scenarios}
              activeIds={activeScenarioIdsArray}
              fixedSubPockets={fixedSubPockets}
              onToggle={budgetActions.toggleScenario}
              onCreate={() => {
                setEditingScenario(null);
                setShowScenarioForm(true);
              }}
              onEdit={(scenario) => {
                setEditingScenario(scenario);
                setShowScenarioForm(true);
              }}
              onDelete={(id) => {
                void budgetActions.deleteScenario(id);
              }}
            />

            <AllocationStrategy
              entries={distributionEntries}
              distributable={budgetActions.remaining}
              currency={budgetCurrency}
              totalPercentage={totalPercentage}
              onEntriesChange={setDistributionEntries}
              showConversion={budgetActions.showConversion}
              convertedAmounts={budgetActions.convertedAmounts}
              primaryCurrency={primaryCurrency}
            />

            <PortfolioDonutChart
              entries={distributionEntries}
              distributable={budgetActions.remaining}
              currency={budgetCurrency}
              colors={ALLOCATION_COLORS}
            />
          </div>

          <DistributionFooter
            onCancel={() => setDistributionEntries([])}
            onGenerate={budgetActions.prepareBatchFromDistribution}
            generateDisabled={generateDisabled}
            hasChanges={hasChanges}
          />
        </section>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
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
            setShowExpenseForm(false);
            setEditingSubPocket(null);
          }}
          onSuccess={() => undefined}
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

      <Modal
        isOpen={showScenarioForm}
        onClose={closeScenarioForm}
        title={editingScenario ? 'Edit Scenario' : 'New Scenario'}
      >
        <ScenarioForm
          initialData={editingScenario}
          fixedSubPockets={fixedSubPockets}
          fixedExpenseGroups={fixedExpenseGroups}
          currency={budgetCurrency}
          onSave={handleSaveScenario}
          onCancel={closeScenarioForm}
        />
      </Modal>

      <Modal
        isOpen={fixedExpenseActions.batchForm.isOpen}
        onClose={fixedExpenseActions.batchForm.close}
        size="xl"
      >
        <BatchMovementForm
          onSave={fixedExpenseActions.batchForm.save}
          onCancel={fixedExpenseActions.batchForm.close}
          initialRows={fixedExpenseActions.batchForm.rows}
        />
      </Modal>

      <Modal
        isOpen={budgetActions.batch.isOpen}
        onClose={budgetActions.batch.close}
        size="xl"
      >
        <BatchMovementForm
          onSave={budgetActions.batch.save}
          onCancel={budgetActions.batch.close}
          initialRows={budgetActions.batch.rows}
        />
      </Modal>
    </div>
  );
};

export default UnifiedBudgetPage;
