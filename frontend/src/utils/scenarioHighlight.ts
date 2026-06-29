import type { PlanningScenario } from '../components/budget/ScenarioForm';

/**
 * Derived view of which fixed expenses are emphasized by the active set of
 * planning scenarios.
 *
 * - `expenseIds` — union of every `expenseIds` entry across the active
 *   scenarios. Used by the left panel to know which rows to highlight.
 * - `countByExpense` — how many of the active scenarios each expense
 *   appears in. The expense rows render a "×N" badge when N > 1.
 * - `hasActiveScenarios` — `true` when at least one scenario is selected.
 *   Drives the "dim everything else" focus mode independently of whether
 *   any expense ended up in the highlight set (an active scenario with an
 *   empty `expenseIds` list still dims the rest of the list).
 */
export interface ScenarioHighlight {
  expenseIds: Set<string>;
  countByExpense: Map<string, number>;
  hasActiveScenarios: boolean;
}

/**
 * Compute the {@link ScenarioHighlight} from the full scenario list and the
 * currently-active scenario ids. The function is pure and stable: callers
 * (e.g. `UnifiedBudgetPage`) typically wrap it in a `useMemo`.
 *
 * `activeScenarioIds` may be either a `Set` or an array — `useBudgetActions`
 * exposes a `Set`, but the page also keeps an array form around for
 * components that expect ordered ids, so we accept both.
 */
export const computeScenarioHighlight = (
  scenarios: readonly PlanningScenario[],
  activeScenarioIds: ReadonlySet<string> | readonly string[],
): ScenarioHighlight => {
  const activeSet =
    activeScenarioIds instanceof Set
      ? activeScenarioIds
      : new Set(activeScenarioIds as readonly string[]);

  const expenseIds = new Set<string>();
  const countByExpense = new Map<string, number>();

  for (const scenario of scenarios) {
    if (!activeSet.has(scenario.id)) continue;
    for (const expenseId of scenario.expenseIds) {
      expenseIds.add(expenseId);
      countByExpense.set(expenseId, (countByExpense.get(expenseId) ?? 0) + 1);
    }
  }

  return {
    expenseIds,
    countByExpense,
    hasActiveScenarios: activeSet.size > 0,
  };
};

/**
 * Stable empty value, so consumers can default to "nothing highlighted"
 * without recreating empty collections every render.
 */
export const EMPTY_SCENARIO_HIGHLIGHT: ScenarioHighlight = {
  expenseIds: new Set<string>(),
  countByExpense: new Map<string, number>(),
  hasActiveScenarios: false,
};
