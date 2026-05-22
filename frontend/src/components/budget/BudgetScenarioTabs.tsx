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
    <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 p-1.5 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onToggle(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            activeIds.includes(tab.id)
              ? 'bg-blue-500/10 text-blue-400 font-bold'
              : 'text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          {tab.label}
        </button>
      ))}
      <div className="w-px h-6 bg-gray-600 mx-1" />
      <button
        onClick={onCreate}
        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
        title="Add scenario"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};

export default BudgetScenarioTabs;
