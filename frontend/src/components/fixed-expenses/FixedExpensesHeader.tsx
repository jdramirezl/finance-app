import { FolderPlus, Plus } from 'lucide-react';
import type { Currency } from '../../types';
import CurrencyAmount from '../ui/CurrencyAmount';

export interface FixedExpensesHeaderProps {
  totalMonthly: number;
  totalCommitted: number;
  currency: Currency;
  onAddGroup: () => void;
  onAddExpense: () => void;
}

/**
 * Fixed Expenses page header matching Stitch design:
 * - "OPERATIONAL OVERVIEW" label + "Fixed Expenses" title
 * - Glass card with aggregate monthly, committed funding, percentage badge
 * - Action buttons: Add Group (teal) + Add Expense (outlined)
 */
const FixedExpensesHeader = ({
  totalMonthly,
  totalCommitted,
  currency,
  onAddGroup,
  onAddExpense,
}: FixedExpensesHeaderProps) => {
  const percentage = totalMonthly > 0
    ? ((totalCommitted / totalMonthly) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Title row + stats card */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-primary mb-2">
            OPERATIONAL OVERVIEW
          </p>
          <h1 className="text-4xl font-bold text-on-surface tracking-tight">
            Fixed Expenses
          </h1>
        </div>

        {/* Aggregate stats glass card */}
        <div className="bg-surface-container/80 backdrop-blur-[12px] border border-white/[0.08] rounded-xl px-6 py-4 flex items-center gap-8 min-w-[320px]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant mb-1">
              AGGREGATE MONTHLY
            </p>
            <CurrencyAmount
              amount={totalMonthly}
              currency={currency}
              className="text-lg font-semibold font-mono text-primary"
            />
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant mb-1">
              COMMITTED FUNDING
            </p>
            <CurrencyAmount
              amount={totalCommitted}
              currency={currency}
              className="text-lg font-semibold font-mono text-secondary"
            />
          </div>
          <div className="flex-1 text-right">
            <span className="inline-block px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono font-medium">
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={onAddGroup}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary-container to-[#22d3ee] text-on-primary-container text-sm font-semibold transition-all active:scale-95 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        >
          <FolderPlus className="w-4 h-4" />
          Add Group
        </button>
        <button
          onClick={onAddExpense}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface text-sm font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>
    </div>
  );
};

export default FixedExpensesHeader;
