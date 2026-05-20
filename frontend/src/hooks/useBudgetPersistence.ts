import { useState } from 'react';
import type { DistributionEntry } from '../components/budget';
import type { PlanningScenario } from '../components/budget/ScenarioForm';
import { useDebouncedEffect } from './useDebouncedEffect';

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
  } catch (error) {
    console.error('Error reading budget planning from localStorage:', error);
    return DEFAULT_DATA;
  }
};

const saveBudgetPlanning = (data: BudgetPlanningData): void => {
  try {
    localStorage.setItem(BUDGET_PLANNING_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing budget planning to localStorage:', error);
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

  // Debounced persist: every keystroke or drag updates state in memory, but
  // we only touch localStorage 500ms after the user stops changing things.
  useDebouncedEffect(
    () => {
      saveBudgetPlanning({ initialAmount, distributionEntries, scenarios });
    },
    [initialAmount, distributionEntries, scenarios],
    PERSIST_DELAY_MS
  );

  return {
    initialAmount,
    setInitialAmount,
    distributionEntries,
    setDistributionEntries,
    scenarios,
    setScenarios,
  };
};
