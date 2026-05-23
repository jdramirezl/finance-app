import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { PlanningScenario } from './ScenarioForm';
import type { SubPocket } from '../../types';
import { calculateAporteMensual } from '../../utils/fixedExpenseUtils';

interface BudgetScenarioTabsProps {
  scenarios: PlanningScenario[];
  activeIds: string[];
  onToggle: (id: string) => void;
  onCreate: () => void;
  onEdit?: (scenario: PlanningScenario) => void;
  onDelete?: (id: string) => void;
  fixedSubPockets?: SubPocket[];
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const formatMonthlyTotal = (amount: number): string =>
  `$${numberFormatter.format(Math.round(amount))}/mo`;

// The preview shows the full monthly cost of a scenario — what the user
// would pay if they activated it — so it includes every expense listed in
// `scenario.expenseIds`, regardless of the sub-pocket's current `enabled`
// state. Filtering by `enabled` here would understate the scenario any time
// it included a currently-disabled expense.
const calculateScenarioTotal = (
  scenario: PlanningScenario,
  fixedSubPockets: SubPocket[],
): number => {
  if (!scenario.expenseIds.length || !fixedSubPockets.length) return 0;
  const expenseIds = new Set(scenario.expenseIds);

  return fixedSubPockets
    .filter((sp) => expenseIds.has(sp.id))
    .reduce(
      (sum, sp) =>
        sum +
        calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance),
      0,
    );
};

const BudgetScenarioTabs = ({
  scenarios,
  activeIds,
  onToggle,
  onCreate,
  onEdit,
  onDelete,
  fixedSubPockets = [],
}: BudgetScenarioTabsProps) => {
  // Empty state — no fake default tabs, just a hint and the create button.
  if (scenarios.length === 0) {
    return (
      <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 px-4 py-3 rounded-xl">
        <span className="text-sm text-gray-500">
          Create your first scenario
        </span>
        <button
          onClick={onCreate}
          className="ml-auto p-2 text-gray-400 hover:text-blue-400 transition-colors"
          title="Add scenario"
          aria-label="Add scenario"
          type="button"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 p-1.5 rounded-xl flex-wrap">
      {scenarios.map((scenario) => {
        const isActive = activeIds.includes(scenario.id);
        const total = calculateScenarioTotal(scenario, fixedSubPockets);
        const hasActions = Boolean(onEdit || onDelete);

        return (
          <div
            key={scenario.id}
            className={`group flex items-stretch rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-500/10 border border-blue-500/30'
                : 'border border-transparent hover:bg-gray-700/50'
            }`}
          >
            <button
              type="button"
              onClick={() => onToggle(scenario.id)}
              className={`flex-1 px-4 py-2 text-left text-sm transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-400'
              } ${hasActions ? '' : 'rounded-lg'}`}
            >
              <div className={isActive ? 'font-bold' : ''}>{scenario.name}</div>
              <div
                className={`text-xs mt-0.5 ${
                  isActive ? 'text-blue-400/70' : 'text-gray-500'
                }`}
              >
                {formatMonthlyTotal(total)}
              </div>
            </button>

            {hasActions && (
              <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(scenario)}
                    className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                    title={`Edit ${scenario.name}`}
                    aria-label={`Edit ${scenario.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(scenario.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title={`Delete ${scenario.name}`}
                    aria-label={`Delete ${scenario.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="w-px h-6 bg-gray-600 mx-1" />
      <button
        onClick={onCreate}
        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
        title="Add scenario"
        aria-label="Add scenario"
        type="button"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};

export default BudgetScenarioTabs;
