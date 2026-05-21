import { Plus } from 'lucide-react';
import type { PlanningScenario } from './ScenarioForm';

interface BudgetScenarioTabsProps {
  scenarios: PlanningScenario[];
  activeIds: string[];
  onToggle: (id: string) => void;
  onCreate: () => void;
}

const DEFAULT_TABS = [
  { id: '__normal', label: 'Normal Month' },
  { id: '__holiday', label: 'Holiday' },
  { id: '__crisis', label: 'Crisis Mode' },
];

const BudgetScenarioTabs = ({ scenarios, activeIds, onToggle, onCreate }: BudgetScenarioTabsProps) => {
  const tabs = scenarios.length > 0
    ? scenarios.map((s) => ({ id: s.id, label: s.name }))
    : DEFAULT_TABS;

  return (
    <div className="flex items-center gap-1 glass-card p-1.5 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onToggle(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            activeIds.includes(tab.id)
              ? 'bg-primary/10 text-primary font-bold'
              : 'text-on-surface-variant hover:bg-white/5'
          }`}
        >
          {tab.label}
        </button>
      ))}
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button
        onClick={onCreate}
        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
        title="Add scenario"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};

export default BudgetScenarioTabs;
