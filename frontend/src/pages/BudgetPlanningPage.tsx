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
import AccountPocketSelector from '../components/movements/AccountPocketSelector';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton, SkeletonCard, SkeletonList } from '../components/ui/Skeleton';
import {
  BudgetDistribution,
  BudgetIncomeSection,
  BudgetSummaryCard,
  ScenarioSection,
} from '../components/budget';
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

  // Modal state — page owns it.
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState<PlanningScenario | null>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonList items={5} />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Budget Planning" />
        <div className="flex items-center gap-4">
          <div className="w-64">
            <AccountPocketSelector
              accountId={defaultAccountId}
              pocketId={defaultPocketId}
              onAccountChange={setDefaultAccountId}
              onPocketChange={setDefaultPocketId}
              accountLabel="Default Account"
              pocketLabel="Default Pocket"
            />
          </div>
          <Button
            variant="secondary"
            onClick={actions.prepareBatchFromDistribution}
            disabled={initialAmount <= 0}
          >
            <Receipt className="w-5 h-5" />
            Create Movements
          </Button>
        </div>
      </div>

      <BudgetIncomeSection initialAmount={initialAmount} onChange={setInitialAmount} />

      <ScenarioSection
        scenarios={scenarios}
        activeScenarioIds={actions.activeScenarioIds}
        fixedSubPockets={fixedSubPockets}
        currency={budgetCurrency}
        onCreate={() => {
          setEditingScenario(null);
          setShowScenarioForm(true);
        }}
        onEdit={(scenario) => {
          setEditingScenario(scenario);
          setShowScenarioForm(true);
        }}
        onDelete={actions.deleteScenario}
        onToggle={actions.toggleScenario}
      />

      {initialAmount > 0 && (
        <BudgetSummaryCard
          initialAmount={initialAmount}
          totalFixedExpenses={actions.totalFijosMes}
          remaining={actions.remaining}
          currency={budgetCurrency}
        />
      )}

      {actions.remaining > 0 && (
        <BudgetDistribution
          entries={distributionEntries}
          remaining={actions.remaining}
          currency={budgetCurrency}
          primaryCurrency={primaryCurrency}
          showConversion={actions.showConversion}
          convertedAmounts={actions.convertedAmounts}
          onEntriesChange={setDistributionEntries}
          pockets={pockets}
          accounts={accounts}
        />
      )}

      {fixedPockets.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No fixed expenses pocket found"
          description="Create one in the Accounts page to see fixed expenses deductions here."
        />
      )}

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
