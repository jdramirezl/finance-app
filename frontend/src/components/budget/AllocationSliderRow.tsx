import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import type { DistributionEntry } from './BudgetEntryRow';

interface AllocationSliderRowProps {
  entry: DistributionEntry;
  color: string;
  amount: number;
  currency: string;
  onPercentageChange: (id: string, percentage: number) => void;
  onDelete: (id: string) => void;
}

const fmt = (value: number, currency: string) =>
  value.toLocaleString(undefined, { style: 'currency', currency });

const AllocationSliderRow = ({
  entry,
  color,
  amount,
  currency,
  onPercentageChange,
  onDelete,
}: AllocationSliderRowProps) => {
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-3">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-on-surface">{entry.name || 'Unnamed'}</span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-sm text-on-surface-variant">{entry.percentage}%</span>
          <span className="font-mono text-lg text-on-surface">{fmt(amount, currency)}</span>
          <button
            onClick={() => onDelete(entry.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-error hover:bg-error/10 rounded transition-opacity"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={entry.percentage}
        onChange={(e) => onPercentageChange(entry.id, parseInt(e.target.value, 10))}
        className="range-slider w-full"
      />
    </div>
  );
};

export default memo(AllocationSliderRow);
