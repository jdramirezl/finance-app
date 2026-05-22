import { useCallback, useMemo } from 'react';
import { Plus, Zap } from 'lucide-react';
import type { DistributionEntry } from './BudgetEntryRow';
import AllocationSliderRow from './AllocationSliderRow';

const ALLOCATION_COLORS = [
  '#4cd7f6', '#f64c72', '#a29bfe', '#fab1a0', '#00b894',
  '#ffeaa7', '#74b9ff', '#fd79a8', '#55efc4', '#e17055',
];

interface AllocationStrategyProps {
  entries: DistributionEntry[];
  distributable: number;
  currency: string;
  totalPercentage: number;
  onEntriesChange: (entries: DistributionEntry[]) => void;
  onGenerateMovements: () => void;
  generateDisabled: boolean;
}

const AllocationStrategy = ({
  entries,
  distributable,
  currency,
  totalPercentage,
  onEntriesChange,
  onGenerateMovements,
  generateDisabled,
}: AllocationStrategyProps) => {
  const calcAmount = useCallback(
    (pct: number) => (distributable > 0 ? (distributable * pct) / 100 : 0),
    [distributable]
  );

  const handlePercentageChange = useCallback(
    (id: string, percentage: number) => {
      onEntriesChange(entries.map((e) => (e.id === id ? { ...e, percentage } : e)));
    },
    [entries, onEntriesChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      onEntriesChange(entries.filter((e) => e.id !== id));
    },
    [entries, onEntriesChange]
  );

  const handleAdd = () => {
    onEntriesChange([
      ...entries,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name: '', percentage: 0 },
    ]);
  };

  const isFullyAllocated = totalPercentage === 100;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex-1">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-100">Allocation Strategy</h3>
        <div className="flex items-center gap-3">
          {entries.length > 0 && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
              isFullyAllocated
                ? 'bg-gray-600 border-gray-700'
                : 'bg-red-400/10 border-red-400/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isFullyAllocated ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-xs font-medium ${isFullyAllocated ? 'text-blue-400' : 'text-red-400'}`}>
                {totalPercentage}% Allocated
              </span>
            </div>
          )}
          <button
            onClick={handleAdd}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            title="Add entry"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-2">No allocation entries yet</p>
          <button onClick={handleAdd} className="text-blue-400 hover:underline text-sm">
            Add your first entry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.map((entry, i) => (
            <AllocationSliderRow
              key={entry.id}
              entry={entry}
              color={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]}
              amount={calcAmount(entry.percentage)}
              distributable={distributable}
              currency={currency}
              onPercentageChange={handlePercentageChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Generate Movements button */}
      <button
        onClick={onGenerateMovements}
        disabled={generateDisabled}
        className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#22d3ee] text-white font-bold text-lg shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
      >
        <Zap className="w-5 h-5" />
        Generate Movements
      </button>
    </div>
  );
};

export { ALLOCATION_COLORS };
export default AllocationStrategy;
