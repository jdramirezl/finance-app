import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DistributionEntry } from '../components/budget';
import type { PlanningScenario } from '../components/budget/ScenarioForm';
import type { Currency } from '../constants/currencies';
import { budgetPlanningService } from '../services/budgetPlanningService';

const BUDGET_PLANNING_KEY = 'finance_app_budget_planning';
const PERSIST_DELAY_MS = 500;

export interface BudgetPlanningData {
  initialAmount: number;
  distributionEntries: DistributionEntry[];
  scenarios: PlanningScenario[];
  defaultAccountId: string;
  defaultPocketId: string;
  /**
   * Currency the budget is denominated in. Empty string means "auto-detect"
   * (fall back to the default account's currency or the user's primary
   * currency). Stored as `string` rather than {@link Currency} so the empty
   * sentinel value is representable; the setter narrows to `Currency | ''`.
   */
  budgetCurrency: string;
}

const DEFAULT_DATA: BudgetPlanningData = {
  initialAmount: 0,
  distributionEntries: [],
  scenarios: [],
  defaultAccountId: '',
  defaultPocketId: '',
  budgetCurrency: '',
};

const loadFromLocalStorage = (): BudgetPlanningData => {
  try {
    const item = localStorage.getItem(BUDGET_PLANNING_KEY);
    if (!item) return DEFAULT_DATA;
    return { ...DEFAULT_DATA, ...JSON.parse(item) };
  } catch {
    return DEFAULT_DATA;
  }
};

export interface UseBudgetPersistenceResult {
  initialAmount: number;
  setInitialAmount: (value: number) => void;
  distributionEntries: DistributionEntry[];
  setDistributionEntries: (entries: DistributionEntry[]) => void;
  scenarios: PlanningScenario[];
  setScenarios: React.Dispatch<React.SetStateAction<PlanningScenario[]>>;
  defaultAccountId: string;
  setDefaultAccountId: (value: string) => void;
  defaultPocketId: string;
  setDefaultPocketId: (value: string) => void;
  budgetCurrency: string;
  setBudgetCurrency: (value: Currency | '') => void;
}

/**
 * Persists budget-planning state to Supabase (authoritative) with localStorage
 * as a write-through cache for offline/fast-mount support.
 *
 * On mount: state initializes from localStorage (instant). Once the Supabase
 * fetch resolves, remote data overrides local state (one-time sync). Writes
 * are debounced by {@link PERSIST_DELAY_MS} and go to both localStorage and
 * Supabase.
 */
export const useBudgetPersistence = (): UseBudgetPersistenceResult => {
  // Immediate init from localStorage (synchronous, fast)
  const local = loadFromLocalStorage();
  const [initialAmount, setInitialAmount] = useState<number>(local.initialAmount);
  const [distributionEntries, setDistributionEntries] = useState<DistributionEntry[]>(
    local.distributionEntries,
  );
  const [scenarios, setScenarios] = useState<PlanningScenario[]>(local.scenarios);
  const [defaultAccountId, setDefaultAccountId] = useState<string>(local.defaultAccountId);
  const [defaultPocketId, setDefaultPocketId] = useState<string>(local.defaultPocketId);
  const [budgetCurrency, setBudgetCurrency] = useState<Currency | ''>(
    (local.budgetCurrency as Currency | '') || '',
  );

  // Fetch remote data (one-time, staleTime: Infinity)
  const { data: remoteData } = useQuery({
    queryKey: ['budgetPlanning'],
    queryFn: () => budgetPlanningService.get(),
    staleTime: Infinity,
  });

  // One-time sync: when remote data arrives and has meaningful content,
  // override local state. This makes Supabase the authoritative source.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!remoteData || syncedRef.current) return;
    // Only override if remote has real data (not just defaults)
    const hasData =
      remoteData.initialAmount > 0 ||
      remoteData.distributionEntries.length > 0 ||
      remoteData.scenarios.length > 0 ||
      remoteData.defaultAccountId !== '' ||
      remoteData.defaultPocketId !== '';
    if (!hasData) {
      syncedRef.current = true;
      return;
    }
    setInitialAmount(remoteData.initialAmount);
    setDistributionEntries(remoteData.distributionEntries);
    setScenarios(remoteData.scenarios);
    setDefaultAccountId(remoteData.defaultAccountId);
    setDefaultPocketId(remoteData.defaultPocketId);
    setBudgetCurrency((remoteData.budgetCurrency as Currency | '') || '');
    syncedRef.current = true;
  }, [remoteData]);

  // Skip the very first effect run — nothing user-driven to persist yet.
  const isFirstRunRef = useRef(true);

  // Debounced persist: write to both localStorage and Supabase.
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    const data: BudgetPlanningData = {
      initialAmount,
      distributionEntries,
      scenarios,
      defaultAccountId,
      defaultPocketId,
      budgetCurrency,
    };

    const timeoutId = setTimeout(() => {
      // Write-through to localStorage (fast, offline-safe)
      try {
        localStorage.setItem(BUDGET_PLANNING_KEY, JSON.stringify(data));
      } catch {
        // localStorage may be unavailable or full; best-effort.
      }
      // Persist to Supabase (authoritative)
      budgetPlanningService.save(data);
    }, PERSIST_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [initialAmount, distributionEntries, scenarios, defaultAccountId, defaultPocketId, budgetCurrency]);

  return {
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
    budgetCurrency,
    setBudgetCurrency,
  };
};
