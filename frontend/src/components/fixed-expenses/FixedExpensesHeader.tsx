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
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-blue-400 mb-2">
            OPERATIONAL OVERVIEW
          </p>
          <h1 className="text-4xl font-bold text-gray-100 tracking-tight">
            Fixed Expenses
          </h1>
        </div>

        {/* Aggregate stats glass card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-4 flex items-center gap-8 min-w-[320px]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 mb-1">
              AGGREGATE MONTHLY
            </p>
            <CurrencyAmount
              amount={totalMonthly}
              currency={currency}
              className="text-lg font-semibold text-blue-400"
            />
          </div>
          <div className="h-10 w-px bg-gray-600" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 mb-1">
              COMMITTED FUNDING
            </p>
            <CurrencyAmount
              amount={totalCommitted}
              currency={currency}
              className="text-lg font-semibold text-blue-300"
            />
          </div>
          <div className="flex-1 text-right">
            <span className="inline-block px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={onAddGroup}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-[#22d3ee] text-white text-sm font-semibold transition-all active:scale-95 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        >
          <FolderPlus className="w-4 h-4" />
          Add Group
        </button>
        <button
          onClick={onAddExpense}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-600 bg-gray-700/50 hover:bg-gray-600 text-gray-100 text-sm font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>
    </div>
  );
};

export default FixedExpensesHeader;
