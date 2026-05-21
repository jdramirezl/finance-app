import { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import {
  useAccountsQuery,
  useFixedExpenseGroupsQuery,
  useMovementMutations,
  usePocketsQuery,
  useSettingsQuery,
  useSubPocketsQuery,
} from '../hooks/queries';
import { useBudgetActions } from '../hooks/actions/useBudgetActions';
import { useBudgetPersistence } from '../hooks/useBudgetPersistence';
import { useToast } from '../hooks/useToast';
import type { Currency } from '../types';
import BatchMovementForm from '../components/movements/BatchMovementForm';
import Modal from '../components/ui/Modal';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import BudgetScenarioTabs from '../components/budget/BudgetScenarioTabs';
import BudgetIncomeCard from '../components/budget/BudgetIncomeCard';
import AllocationStrategy from '../components/budget/AllocationStrategy';
import BudgetSidebar from '../components/budget/BudgetSidebar';
import ScenarioForm, {
  type PlanningScenario,
} from '../components/budget/ScenarioForm';

const BudgetPlanningPage = () => {
  // Data
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { data: subPockets = [] } = useSubPocketsQuery();
  const { data: fixedExpenseGroups = [] } = useFixedExpenseGroupsQuery();
  const { data: settings = { primaryCurrency: 'USD' as Currency }, isLoading } =
    useSettingsQuery();

  // Mutations + helpers
  const movementMutations = useMovementMutations();
  const toast = useToast();

  // Persistent state (localStorage-backed)
  const {
    initialAmount,
    setInitialAmount,
    distributionEntries,
    setDistributionEntries,
    scenarios,
    setScenarios,
    defaultAccountId,
    setDefaultAccountId,
    defaultPocketId,
    setDefaultPocketId,
  } = useBudgetPersistence();

  // Modal state
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState<PlanningScenario | null>(null);
  const [activeScenarioTab, setActiveScenarioTab] = useState<string | null>(null);

  // Derived data
  const fixedPockets = useMemo(
    () => pockets.filter((p) => p.type === 'fixed'),
    [pockets]
  );
  const fixedSubPockets = useMemo(
    () => subPockets.filter((sp) => fixedPockets.some((fp) => fp.id === sp.pocketId)),
    [subPockets, fixedPockets]
  );

  const primaryCurrency = settings?.primaryCurrency || 'USD';
  const budgetCurrency = (fixedPockets[0]?.currency || primaryCurrency) as Currency;

  const actions = useBudgetActions({
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

  const totalPercentage = useMemo(
    () => distributionEntries.reduce((sum, e) => sum + e.percentage, 0),
    [distributionEntries]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  const closeScenarioForm = () => {
    setShowScenarioForm(false);
    setEditingScenario(null);
  };

  const handleSaveScenario = (scenario: PlanningScenario) => {
    actions.saveScenario(scenario);
    closeScenarioForm();
  };

  return (
    <div className="space-y-8">
      {/* Header: Title + Scenario Tabs */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-on-surface">Budget Planning</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Strategic allocation and scenario modeling
          </p>
        </div>
        <BudgetScenarioTabs
          scenarios={scenarios}
          activeId={activeScenarioTab}
          onSelect={setActiveScenarioTab}
          onCreate={() => {
            setEditingScenario(null);
            setShowScenarioForm(true);
          }}
        />
      </section>

      {/* Two-column grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Main content */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <BudgetIncomeCard
            initialAmount={initialAmount}
            onAmountChange={setInitialAmount}
            totalFixedExpenses={actions.totalFijosMes}
            distributable={actions.remaining}
            currency={budgetCurrency}
          />
          <AllocationStrategy
            entries={distributionEntries}
            distributable={actions.remaining}
            currency={budgetCurrency}
            totalPercentage={totalPercentage}
            onEntriesChange={setDistributionEntries}
            onGenerateMovements={actions.prepareBatchFromDistribution}
            generateDisabled={initialAmount <= 0 || distributionEntries.length === 0}
          />
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <BudgetSidebar
            entries={distributionEntries}
            distributable={actions.remaining}
            totalIncome={initialAmount}
            totalFixedExpenses={actions.totalFijosMes}
            currency={budgetCurrency}
          />
        </div>
      </div>

      {/* Modals */}
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

      <Modal isOpen={actions.batch.isOpen} onClose={actions.batch.close} size="xl">
        <BatchMovementForm
          onSave={actions.batch.save}
          onCancel={actions.batch.close}
          initialRows={actions.batch.rows}
        />
      </Modal>
    </div>
  );
};

export default BudgetPlanningPage;
