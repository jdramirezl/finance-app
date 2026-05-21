import { Info, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { currencyService } from '../../services/currencyService';
import type { Currency, SubPocket } from '../../types';
import { calculateAporteMensual } from '../../utils/fixedExpenseUtils';
import Button from '../ui/Button';
import type { PlanningScenario } from './ScenarioForm';

export interface ScenarioSectionProps {
  scenarios: PlanningScenario[];
  activeScenarioIds: Set<string>;
  fixedSubPockets: SubPocket[];
  currency: Currency;
  onCreate: () => void;
  onEdit: (scenario: PlanningScenario) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const calcScenarioTotal = (scenario: PlanningScenario, fixedSubPockets: SubPocket[]) =>
  fixedSubPockets
    .filter((sp) => scenario.expenseIds.includes(sp.id))
    .reduce(
      (sum, sp) =>
        sum + calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance),
      0
    );

/**
 * Scenarios card grid. Lets users define what-if expense subsets and toggle
 * which ones are active. Page owns the active set + scenario state and
 * passes everything in.
 */
const ScenarioSection = ({
  scenarios,
  activeScenarioIds,
  fixedSubPockets,
  currency,
  onCreate,
  onEdit,
  onDelete,
  onToggle,
}: ScenarioSectionProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
          <Layers className="w-5 h-5" aria-hidden="true" />
          Planning Scenarios
        </h2>
        <Button size="sm" variant="secondary" onClick={onCreate}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Scenario
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <div className="p-4 bg-surface-container/50 rounded-lg border border-dashed border-outline-variant text-center">
          <p className="text-sm text-on-surface-variant">
            Create scenarios to test different fixed expense combinations (e.g.
            &quot;Bare Minimum&quot;, &quot;Ideal&quot;).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => {
            const isActive = activeScenarioIds.has(scenario.id);
            const total = calcScenarioTotal(scenario, fixedSubPockets);
            return (
              <div
                key={scenario.id}
                className={`relative p-4 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 border-primary ring-1 ring-primary'
                    : 'bg-surface-container border-outline-variant hover:border-primary/50'
                }`}
                onClick={() => onToggle(scenario.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(scenario.id);
                  }
                }}
                aria-pressed={isActive}
                aria-label={`${isActive ? 'Deactivate' : 'Activate'} scenario ${scenario.name}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-on-surface">
                    {scenario.name}
                  </h3>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit(scenario)}
                      className="p-1 text-on-surface-variant hover:text-primary"
                      aria-label={`Edit scenario ${scenario.name}`}
                      title="Edit scenario"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => onDelete(scenario.id)}
                      className="p-1 text-on-surface-variant hover:text-[#ffb4ab]"
                      aria-label={`Delete scenario ${scenario.name}`}
                      title="Delete scenario"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="text-2xl font-bold text-on-surface font-mono">
                  {currencyService.formatCurrency(total, currency)}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {scenario.expenseIds.length} expenses included
                </p>
              </div>
            );
          })}
        </div>
      )}

      {activeScenarioIds.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-2 rounded">
          <Info className="w-4 h-4" aria-hidden="true" />
          <span>
            Using expenses from <b>{activeScenarioIds.size} active scenario(s)</b>{' '}
            instead of default enabled expenses.
          </span>
        </div>
      )}
    </div>
  );
};

export default ScenarioSection;
