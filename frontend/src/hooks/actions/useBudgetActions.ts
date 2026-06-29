import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { currencyService } from '../../services/currencyService';
import type { Account, Currency, Pocket, SubPocket } from '../../types';
import type { BatchMovementRow } from '../../components/movements/BatchMovementForm';
import type { DistributionEntry } from '../../components/budget';
import type { PlanningScenario } from '../../components/budget/ScenarioForm';
import { calculateAporteMensual } from '../../utils/fixedExpenseUtils';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import type { useToast } from '../useToast';
import type { useMovementMutations } from '../queries/useMovementMutations';

type MovementMutations = ReturnType<typeof useMovementMutations>;

export interface BudgetBatchController {
  isOpen: boolean;
  rows: BatchMovementRow[];
  close: () => void;
  save: (rows: BatchMovementRow[]) => Promise<void>;
}

export interface UseBudgetActionsParams {
  accounts: Account[];
  pockets: Pocket[];
  fixedPockets: Pocket[];
  fixedSubPockets: SubPocket[];
  initialAmount: number;
  distributionEntries: DistributionEntry[];
  scenarios: PlanningScenario[];
  setScenarios: React.Dispatch<React.SetStateAction<PlanningScenario[]>>;
  budgetCurrency: Currency;
  primaryCurrency: Currency;
  movementMutations: MovementMutations;
  toast: ReturnType<typeof useToast.getState>;
  defaultAccountId: string;
  defaultPocketId: string;
}

export interface UseBudgetActionsResult {
  totalFijosMes: number;
  remaining: number;
  showConversion: boolean;
  convertedAmounts: Map<string, number>;
  /**
   * `remaining` converted into the user's primary currency. Undefined
   * when no conversion is needed (`!showConversion`) or while the async
   * conversion is in flight. Used by `DistributionHeader` to render a
   * subtle "≈ $X,XXX PRIMARY" hint beneath the distributable total.
   */
  convertedRemaining: number | undefined;
  // Scenario state + handlers
  activeScenarioIds: Set<string>;
  toggleScenario: (id: string) => void;
  saveScenario: (scenario: PlanningScenario) => void;
  deleteScenario: (id: string) => Promise<void>;
  // Batch movements
  prepareBatchFromDistribution: () => void;
  prepareUnifiedBatch: () => void;
  batch: BudgetBatchController;
}

/**
 * Bundles the imperative side of the Budget Planning page: deductions
 * (scenario-aware), entry-amount calculation, currency conversion of
 * displayed amounts, scenario CRUD, and the batch movement flow that
 * materializes a budget plan into actual movements.
 */
export const useBudgetActions = ({
  accounts,
  pockets,
  fixedPockets,
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
}: UseBudgetActionsParams): UseBudgetActionsResult => {
  const { createMovement } = movementMutations;
  const { confirm } = useConfirmDialog();

  const [activeScenarioIds, setActiveScenarioIds] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchMovementRow[]>([]);
  const [convertedAmounts, setConvertedAmounts] = useState<Map<string, number>>(
    new Map()
  );
  const [convertedRemaining, setConvertedRemaining] = useState<number | undefined>(
    undefined
  );

  const showConversion = primaryCurrency !== budgetCurrency;

  // Pick the relevant subset of fixed expenses based on active scenarios.
  // - No scenarios exist: fall back to all fixed expenses.
  // - Scenarios exist but none active: empty (manual override).
  // - Scenarios active: union of expenses in those scenarios.
  const relevantFixedSubPockets = useMemo<SubPocket[]>(() => {
    if (activeScenarioIds.size > 0) {
      const allIds = new Set<string>();
      scenarios.forEach((s) => {
        if (activeScenarioIds.has(s.id)) s.expenseIds.forEach((id) => allIds.add(id));
      });
      return fixedSubPockets.filter((sp) => allIds.has(sp.id));
    }
    if (scenarios.length > 0) {
      return [];
    }
    return fixedSubPockets;
  }, [activeScenarioIds, scenarios, fixedSubPockets]);

  const totalFijosMes = useMemo(
    () =>
      relevantFixedSubPockets.reduce(
        (sum, sp) =>
          sum + calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance),
        0
      ),
    [relevantFixedSubPockets]
  );

  const remaining = initialAmount - totalFijosMes;

  const calculateEntryAmount = useCallback(
    (percentage: number): number => {
      if (remaining <= 0) return 0;
      return (remaining * percentage) / 100;
    },
    [remaining]
  );

  // Convert displayed amounts when budget currency differs from primary.
  useEffect(() => {
    const convertAmounts = async () => {
      if (!showConversion || distributionEntries.length === 0) return;
      const next = new Map<string, number>();

      for (const entry of distributionEntries) {
        const amount = calculateEntryAmount(entry.percentage);
        if (amount > 0) {
          try {
            const converted = await currencyService.convert(
              amount,
              budgetCurrency,
              primaryCurrency
            );
            next.set(entry.id, converted);
          } catch {
            // Conversion failed (network/backend); leave the entry without a
            // converted amount so the UI falls back to the source currency.
          }
        }
      }
      setConvertedAmounts(next);
    };

    convertAmounts();
  }, [
    distributionEntries,
    showConversion,
    budgetCurrency,
    primaryCurrency,
    calculateEntryAmount,
  ]);

  // Convert the remaining (distributable) into primary currency for the
  // header hint. Kept separate from the per-entry effect so it still runs
  // when there are no distribution entries yet.
  useEffect(() => {
    let cancelled = false;

    const updateConvertedRemaining = async () => {
      if (!showConversion) {
        if (!cancelled) setConvertedRemaining(undefined);
        return;
      }
      if (remaining <= 0) {
        if (!cancelled) setConvertedRemaining(0);
        return;
      }

      try {
        const converted = await currencyService.convert(
          remaining,
          budgetCurrency,
          primaryCurrency
        );
        if (!cancelled) setConvertedRemaining(converted);
      } catch {
        // Conversion failed; clear the hint so the header simply shows
        // the source amount until a successful conversion arrives.
        if (!cancelled) setConvertedRemaining(undefined);
      }
    };

    updateConvertedRemaining();

    return () => {
      cancelled = true;
    };
  }, [showConversion, remaining, budgetCurrency, primaryCurrency]);

  const toggleScenario = (id: string) => {
    setActiveScenarioIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveScenario = (scenario: PlanningScenario) => {
    setScenarios((prev) => {
      const exists = prev.some((s) => s.id === scenario.id);
      return exists
        ? prev.map((s) => (s.id === scenario.id ? scenario : s))
        : [...prev, scenario];
    });
  };

  const deleteScenario = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Scenario',
      message: 'Are you sure you want to delete this scenario?',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    setScenarios((prev) => prev.filter((s) => s.id !== id));
    setActiveScenarioIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const prepareBatchFromDistribution = () => {
    const active = distributionEntries.filter((e) => e.percentage > 0);
    if (active.length === 0) {
      toast.error('No distribution entries to create movements from.');
      return;
    }

    const rows: BatchMovementRow[] = [];
    active.forEach((entry) => {
      const amount = calculateEntryAmount(entry.percentage);
      if (amount <= 0) return;

      // Use explicitly linked pocket; fall back to user-selected default.
      const matchedPocket =
        entry.pocketId ? pockets.find((p) => p.id === entry.pocketId) : undefined;
      const accountId =
        matchedPocket?.accountId ?? entry.accountId ?? defaultAccountId ?? '';
      const pocketId = matchedPocket?.id ?? defaultPocketId ?? '';
      const account = accountId ? accounts.find((a) => a.id === accountId) : undefined;

      rows.push({
        id: crypto.randomUUID(),
        type: 'IngresoNormal',
        accountId: account?.id || '',
        pocketId,
        amount: amount.toFixed(2),
        notes: `Budget Distribution: ${entry.name}`,
        displayedDate: format(new Date(), 'yyyy-MM-dd'),
      });
    });

    if (rows.length === 0) {
      toast.error('Calculated amounts are zero.');
      return;
    }

    setBatchRows(rows);
    setBatchOpen(true);
    toast.success(rows.length === 1 ? 'Prepared 1 movement' : `Prepared ${rows.length} movements`);
  };

  /**
   * Build a single batch combining distribution rows AND scenario-filtered
   * fixed expense rows. This is the entry point behind the unified
   * "Generate Movements" button on the budget page — the older
   * `prepareBatchFromDistribution` and the fixed-expense-only batch flow
   * are kept as separate code paths only for testing and back-compat.
   */
  const prepareUnifiedBatch = () => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // 1. Distribution rows — same logic as prepareBatchFromDistribution
    //    but without the toast/short-circuit (we still want to generate
    //    fixed expense rows even if distribution is empty).
    const distributionRows: BatchMovementRow[] = [];
    distributionEntries
      .filter((e) => e.percentage > 0)
      .forEach((entry) => {
        const amount = calculateEntryAmount(entry.percentage);
        if (amount <= 0) return;

        const matchedPocket =
          entry.pocketId ? pockets.find((p) => p.id === entry.pocketId) : undefined;
        const accountId =
          matchedPocket?.accountId ?? entry.accountId ?? defaultAccountId ?? '';
        const pocketId = matchedPocket?.id ?? defaultPocketId ?? '';
        const account = accountId ? accounts.find((a) => a.id === accountId) : undefined;

        distributionRows.push({
          id: crypto.randomUUID(),
          type: 'IngresoNormal',
          accountId: account?.id || '',
          pocketId,
          amount: amount.toFixed(2),
          notes: `Budget Distribution: ${entry.name}`,
          displayedDate: today,
        });
      });

    // 2. Fixed expense rows — scenario filter via `relevantFixedSubPockets`.
    const fixedRows: BatchMovementRow[] = relevantFixedSubPockets.map((sp) => {
      const parent = fixedPockets.find((fp) => fp.id === sp.pocketId);
      const account = parent ? accounts.find((a) => a.id === parent.accountId) : null;
      return {
        id: crypto.randomUUID(),
        type: 'IngresoFijo',
        accountId: account?.id || '',
        pocketId: sp.pocketId,
        subPocketId: sp.id,
        amount: calculateAporteMensual(
          sp.valueTotal,
          sp.periodicityMonths,
          sp.balance
        ).toFixed(2),
        notes: `Monthly contribution for ${sp.name}`,
        displayedDate: today,
      };
    });

    const allRows = [...distributionRows, ...fixedRows];

    if (allRows.length === 0) {
      toast.error('No movements to generate.');
      return;
    }

    setBatchRows(allRows);
    setBatchOpen(true);
    toast.success(
      allRows.length === 1 ? 'Prepared 1 movement' : `Prepared ${allRows.length} movements`
    );
  };

  const saveBatch = async (rows: BatchMovementRow[]) => {
    try {
      for (const row of rows) {
        await createMovement.mutateAsync({
          type: row.type,
          accountId: row.accountId,
          pocketId: row.pocketId,
          // Forward the row's subPocketId so fixed-expense rows (and any
          // other row the user attaches a sub-pocket to in the batch modal)
          // actually persist against the sub-pocket. Without this the
          // movement gets created on the parent pocket only and the
          // sub-pocket balance never updates — which is exactly the bug
          // reported for the Generate Movements flow.
          subPocketId: row.subPocketId || undefined,
          amount: parseFloat(row.amount),
          notes: row.notes || undefined,
          displayedDate: row.displayedDate,
          isPending: row.isPending || false,
        });
      }
      setBatchOpen(false);
      setBatchRows([]);
      toast.success('Successfully distributed budget!');
    } catch {
      // Toast is shown by the mutation's onError handler.
    }
  };

  const closeBatch = () => {
    setBatchOpen(false);
    setBatchRows([]);
  };

  return {
    totalFijosMes,
    remaining,
    showConversion,
    convertedAmounts,
    convertedRemaining,
    activeScenarioIds,
    toggleScenario,
    saveScenario,
    deleteScenario,
    prepareBatchFromDistribution,
    prepareUnifiedBatch,
    batch: {
      isOpen: batchOpen,
      rows: batchRows,
      close: closeBatch,
      save: saveBatch,
    },
  };
};
