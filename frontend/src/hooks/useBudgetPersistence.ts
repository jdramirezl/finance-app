import { useEffect, useRef, useState } from 'react';
import type { DistributionEntry } from '../components/budget';
import type { PlanningScenario } from '../components/budget/ScenarioForm';

const BUDGET_PLANNING_KEY = 'finance_app_budget_planning';
const PERSIST_DELAY_MS = 500;

export interface BudgetPlanningData {
  initialAmount: number;
  distributionEntries: DistributionEntry[];
  scenarios: PlanningScenario[];
}

const DEFAULT_DATA: BudgetPlanningData = {
  initialAmount: 0,
  distributionEntries: [],
  scenarios: [],
};

const loadBudgetPlanning = (): BudgetPlanningData => {
  try {
    const item = localStorage.getItem(BUDGET_PLANNING_KEY);
    if (!item) return DEFAULT_DATA;
    return { ...DEFAULT_DATA, ...JSON.parse(item) };
  } catch {
    return DEFAULT_DATA;
  }
};

const saveBudgetPlanning = (data: BudgetPlanningData): void => {
  try {
    localStorage.setItem(BUDGET_PLANNING_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable or full; persistence is best-effort.
  }
};

export interface UseBudgetPersistenceResult {
  initialAmount: number;
  setInitialAmount: (value: number) => void;
  distributionEntries: DistributionEntry[];
  setDistributionEntries: (entries: DistributionEntry[]) => void;
  scenarios: PlanningScenario[];
  setScenarios: React.Dispatch<React.SetStateAction<PlanningScenario[]>>;
}

/**
 * Persists budget-planning state in localStorage. Budget planning is purely
 * device-local UI state (initial amount, distribution percentages, what-if
 * scenarios) and never round-trips to the backend.
 *
 * State is loaded once on mount; writes are debounced by {@link PERSIST_DELAY_MS}
 * so rapid edits (typing an amount, dragging a percentage) coalesce into a
 * single `localStorage.setItem` once the user pauses.
 */
export const useBudgetPersistence = (): UseBudgetPersistenceResult => {
  const initial = loadBudgetPlanning();
  const [initialAmount, setInitialAmount] = useState<number>(initial.initialAmount || 0);
  const [distributionEntries, setDistributionEntries] = useState<DistributionEntry[]>(
    initial.distributionEntries || []
  );
  const [scenarios, setScenarios] = useState<PlanningScenario[]>(
    initial.scenarios || []
  );

  // Skip the very first effect run on mount — there's nothing user-driven to
  // persist yet, and writing back what we just loaded is wasted work.
  const isFirstRunRef = useRef(true);

  // Debounced persist: every change resets the timer; the write happens
  // PERSIST_DELAY_MS after the user stops editing.
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      saveBudgetPlanning({ initialAmount, distributionEntries, scenarios });
    }, PERSIST_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [initialAmount, distributionEntries, scenarios]);

  return {
    initialAmount,
    setInitialAmount,
    distributionEntries,
    setDistributionEntries,
    scenarios,
    setScenarios,
  };
};
