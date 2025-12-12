import { useEffect, useState } from 'react';
import { useAccountsQuery, usePocketsQuery, useSubPocketsQuery, useSettingsQuery, useFixedExpenseGroupsQuery, useMovementMutations } from '../hooks/queries';
import { StorageService } from '../services/storageService';
import { currencyService } from '../services/currencyService';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { Skeleton, SkeletonCard, SkeletonList } from '../components/Skeleton';
import type { Currency } from '../types';
import { BudgetSummaryCard, BudgetDistribution, type DistributionEntry } from '../components/budget';
import ScenarioForm, { type PlanningScenario } from '../components/budget/ScenarioForm';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { Receipt, Layers, Plus, Pencil, Trash2, Info } from 'lucide-react';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';
import { useConfirm } from '../hooks/useConfirm';
import BatchMovementForm, { type BatchMovementRow } from '../components/BatchMovementForm';
import { useToast } from '../hooks/useToast';

const BudgetPlanningPage = () => {
  // Queries
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { data: subPockets = [] } = useSubPocketsQuery();
  const { data: fixedExpenseGroups = [] } = useFixedExpenseGroupsQuery();
  const { data: settings = { primaryCurrency: 'USD' }, isLoading: isSettingsLoading } = useSettingsQuery();

  // Mutations
  const { createMovement } = useMovementMutations();

  const toast = useToast();

  const { confirm } = useConfirm();

  // Load persisted data on mount
  const savedData = StorageService.getBudgetPlanning();
  const [initialAmount, setInitialAmount] = useState<number>(savedData.initialAmount || 0);
  const [distributionEntries, setDistributionEntries] = useState<DistributionEntry[]>(
    savedData.distributionEntries || []
  );
  const [scenarios, setScenarios] = useState<PlanningScenario[]>(savedData.scenarios || []);

  // UI State
  const [activeScenarioIds, setActiveScenarioIds] = useState<Set<string>>(new Set());
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState<PlanningScenario | null>(null);

  // Batch movements state
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchMovementRow[]>([]);

  const [convertedAmounts, setConvertedAmounts] = useState<Map<string, number>>(new Map());

  // Derived loading state
  const isLoading = isSettingsLoading;

  // Persist data whenever it changes
  useEffect(() => {
    StorageService.saveBudgetPlanning({
      initialAmount,
      distributionEntries,
      scenarios,
    });
  }, [initialAmount, distributionEntries, scenarios]);

  // Find fixed expenses pocket and calculate total monthly fixed expenses
  const fixedPocket = pockets.find((p) => p.type === 'fixed');
  const fixedSubPockets = fixedPocket ? subPockets.filter(sp => sp.pocketId === fixedPocket.id) : [];
  const fixedAccount = fixedPocket
    ? accounts.find((acc) => acc.id === fixedPocket.accountId)
    : null;

  const primaryCurrency = settings?.primaryCurrency || 'USD';
  const budgetCurrency = fixedAccount?.currency || 'USD';
  const showConversion = primaryCurrency !== budgetCurrency;

  // Calculate total monthly fixed expenses (using next payment logic for negative balances)
  const calculateTotalFijosMes = (): number => {
    let relevantSubPockets: typeof fixedSubPockets = [];

    // Map to track if deduction should apply for a specific expense
    const expenseDeductionMap = new Map<string, boolean>();

    if (activeScenarioIds.size > 0) {
      // If scenarios are active, use union of expenses from scenarios
      const allScenarioExpenseIds = new Set<string>();

      scenarios.forEach(s => {
        if (activeScenarioIds.has(s.id)) {
          s.expenseIds.forEach(id => {
            allScenarioExpenseIds.add(id);
            // If ANY active scenario containing this expense has deductSaved enabled, apply it
            if (s.deductSaved) {
              expenseDeductionMap.set(id, true);
            }
          });
        }
      });
      relevantSubPockets = fixedSubPockets.filter(sp => allScenarioExpenseIds.has(sp.id));
    } else if (scenarios.length > 0) {
      // User has scenarios created but none selected -> Deduct NOTHING (Manual overriding default)
      relevantSubPockets = [];
    } else {
      // Default: No scenarios exist yet -> Use all enabled expenses
      relevantSubPockets = fixedSubPockets.filter(sp => sp.enabled);
    }

    return relevantSubPockets.reduce((sum, sp) => {
      const aporteMensual = calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance);
      const shouldDeduct = expenseDeductionMap.get(sp.id);

      // Case 1: Negative balance - compensate + normal payment (Always applies)
      if (sp.balance < 0) {
        return sum + aporteMensual + Math.abs(sp.balance);
      }

      // Case 2: Deduct saved amounts if scenario requested
      if (shouldDeduct) {
        // If we have saved more than needed for this month (aporteMensual), we pay 0.
        // If we have saved some (e.g. 50 saved, 100 needed), we pay 50.
        // With the new 'aporteMensual' already being capped, we just need to subtract current balance FROM it?
        // No, 'deductSaved' meant "If I have ANY savings, they count towards THIS MONTH's payment".
        // The new logic `max(0, Total - Balance)` essentially does a "Global Deduct Saved".
        // If the user wants `deductSaved` to be even STRONGER (e.g. reduce payment by full balance), 
        // effectively paying 0 if balance > standard payment...
        // The previous logic was: `reducedPayment = max(0, aporteMensual - sp.balance)`.

        // Given the new "Capping" logic is the DEFAULT, `deductSaved` might be redundant 
        // OR it might mean "Use existing balance to cover THIS month's installment specifically".
        // Let's preserve the specific `deductSaved` intent: reduce the monthly bill by current balance.

        const reducedPayment = Math.max(0, aporteMensual - sp.balance);
        return sum + reducedPayment;
      }

      // Normal case (now includes Capping via calculateAporteMensual)
      return sum + aporteMensual;
    }, 0);
  };

  const totalFijosMes = calculateTotalFijosMes();
  const remaining = initialAmount - totalFijosMes;

  // Calculate amount for each distribution entry
  const calculateEntryAmount = (percentage: number): number => {
    if (remaining <= 0) return 0;
    return (remaining * percentage) / 100;
  };

  // Convert amounts to primary currency when needed
  useEffect(() => {
    const convertAmounts = async () => {
      if (!showConversion || distributionEntries.length === 0) return;

      const newConversions = new Map<string, number>();

      for (const entry of distributionEntries) {
        const amount = calculateEntryAmount(entry.percentage);
        if (amount > 0) {
          try {
            const converted = await currencyService.convert(
              amount,
              budgetCurrency as Currency,
              primaryCurrency as Currency
            );
            newConversions.set(entry.id, converted);
          } catch (err) {
            console.error('Failed to convert currency:', err);
          }
        }
      }

      setConvertedAmounts(newConversions);
    };

    convertAmounts();
  }, [distributionEntries, remaining, showConversion, budgetCurrency, primaryCurrency]);

  const handleCreateMovements = () => {
    const activeEntries = distributionEntries.filter(entry => entry.percentage > 0);

    if (activeEntries.length === 0) {
      toast.error('No distribution entries to create movements from.');
      return;
    }

    const rows: BatchMovementRow[] = [];

    activeEntries.forEach(entry => {
      const amount = calculateEntryAmount(entry.percentage);
      if (amount <= 0) return;

      // Try to match pocket by name (case insensitive)
      // This is a heuristic since DistributionEntry doesn't store pocketId
      const matchedPocket = pockets.find(p => p.name.trim().toLowerCase() === entry.name.trim().toLowerCase());
      const account = matchedPocket ? accounts.find(a => a.id === matchedPocket.accountId) : undefined;

      rows.push({
        id: crypto.randomUUID(),
        type: 'IngresoNormal', // Funding the pocket
        accountId: account?.id || '',
        pocketId: matchedPocket?.id || '',
        amount: amount.toFixed(2),
        notes: `Budget Distribution: ${entry.name}`,
        displayedDate: new Date().toISOString().split('T')[0],
      });
    });

    if (rows.length === 0) {
      toast.error('Calculated amounts are zero.');
      return;
    }

    setBatchRows(rows);
    setShowBatchForm(true);
    toast.success(rows.length === 1 ? 'Prepared 1 movement' : `Prepared ${rows.length} movements`);
  };

  const handleBatchSave = async (rows: BatchMovementRow[]) => {
    try {
      for (const row of rows) {
        await createMovement.mutateAsync({
          type: row.type,
          accountId: row.accountId,
          pocketId: row.pocketId,
          amount: parseFloat(row.amount),
          notes: row.notes || undefined,
          displayedDate: row.displayedDate,
          isPending: row.isPending || false
        });
      }

      setShowBatchForm(false);
      setBatchRows([]);
      toast.success(`Successfully distributed budget!`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save movements';
      toast.error(errorMessage);
    }
  };

  const handleSaveScenario = (scenario: PlanningScenario) => {
    if (editingScenario) {
      setScenarios(prev => prev.map(s => s.id === scenario.id ? scenario : s));
    } else {
      setScenarios(prev => [...prev, scenario]);
    }
    setShowScenarioForm(false);
    setEditingScenario(null);
  };

  const handleDeleteScenario = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Scenario',
      message: 'Are you sure you want to delete this scenario?',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (confirmed) {
      setScenarios(prev => prev.filter(s => s.id !== id));
      setActiveScenarioIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleScenario = (id: string) => {
    setActiveScenarioIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Loading state
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Budget Planning" />
        <Button
          variant="secondary"
          onClick={handleCreateMovements}
          disabled={initialAmount <= 0}
        >
          <Receipt className="w-5 h-5" />
          Create Movements
        </Button>
      </div>

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

      {/* Scenarios Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Planning Scenarios
          </h2>
          <Button size="sm" variant="secondary" onClick={() => {
            setEditingScenario(null);
            setShowScenarioForm(true);
          }}>
            <Plus className="w-4 h-4" />
            New Scenario
          </Button>
        </div>

        {scenarios.length === 0 ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create scenarios to test different fixed expense combinations (e.g. "Bare Minimum", "Ideal").
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map(scenario => {
              const isActive = activeScenarioIds.has(scenario.id);
              // Calculate scenario total
              const scenarioTotal = fixedSubPockets
                .filter(sp => scenario.expenseIds.includes(sp.id))
                .reduce((sum, sp) => {
                  const aporteMensual = calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance);

                  if (scenario.deductSaved && sp.balance > 0) {
                    const reduced = Math.max(0, aporteMensual - sp.balance);
                    return sum + reduced;
                  }

                  return sum + aporteMensual;
                }, 0);

              return (
                <div
                  key={scenario.id}
                  className={`
                    relative p-4 rounded-lg border transition-all cursor-pointer
                    ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'}
                  `}
                  onClick={() => toggleScenario(scenario.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{scenario.name}</h3>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingScenario(scenario); setShowScenarioForm(true); }}
                        className="p-1 text-gray-400 hover:text-blue-500"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(scenario.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {currencyService.formatCurrency(scenarioTotal, budgetCurrency)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                    <span>{scenario.expenseIds.length} expenses included</span>
                    {scenario.deductSaved && (
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">
                        Savings Deducted
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {activeScenarioIds.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 p-2 rounded">
            <Info className="w-4 h-4" />
            <span>Using expenses from <b>{activeScenarioIds.size} active scenario(s)</b> instead of default enabled expenses.</span>
          </div>
        )}
      </div>

      {/* Calculation Summary */}
      {initialAmount > 0 && (
        <BudgetSummaryCard
          initialAmount={initialAmount}
          totalFixedExpenses={totalFijosMes}
          remaining={remaining}
          currency={budgetCurrency}
        />
      )}

      {/* Distribution Grid */}
      {remaining > 0 && (
        <BudgetDistribution
          entries={distributionEntries}
          remaining={remaining}
          currency={budgetCurrency}
          primaryCurrency={primaryCurrency}
          showConversion={showConversion}
          convertedAmounts={convertedAmounts}
          onEntriesChange={setDistributionEntries}
        />
      )}

      {/* Warning if no fixed expenses pocket */}
      {!fixedPocket && (
        <EmptyState
          icon={Receipt}
          title="No fixed expenses pocket found"
          description="Create one in the Accounts page to see fixed expenses deductions here."
        />
      )}

      {/* Scenario Form Modal */}
      <Modal
        isOpen={showScenarioForm}
        onClose={() => {
          setShowScenarioForm(false);
          setEditingScenario(null);
        }}
        title={editingScenario ? 'Edit Scenario' : 'New Scenario'}
      >
        <ScenarioForm
          initialData={editingScenario}
          fixedSubPockets={fixedSubPockets}
          fixedExpenseGroups={fixedExpenseGroups}
          currency={budgetCurrency}
          onSave={handleSaveScenario}
          onCancel={() => {
            setShowScenarioForm(false);
            setEditingScenario(null);
          }}
        />
      </Modal>

      {/* Batch Movement Form Modal */}
      <Modal isOpen={showBatchForm} onClose={() => setShowBatchForm(false)} size="xl">
        <BatchMovementForm
          accounts={accounts}
          getPocketsByAccount={(accountId) => pockets.filter(p => p.accountId === accountId)}
          // Pass empty / unused getter or simple filter for subpockets if needed, 
          // though Budget Distribution usually targets Main Pockets, not SubPockets.
          // BatchMovementForm needs getSubPocketsByPocket?
          getSubPocketsByPocket={(pocketId) => subPockets.filter(sp => sp.pocketId === pocketId)}
          onSave={handleBatchSave}
          onCancel={() => {
            setShowBatchForm(false);
            setBatchRows([]);
          }}
          initialRows={batchRows}
        />
      </Modal>
    </div>
  );
};

export default BudgetPlanningPage;
