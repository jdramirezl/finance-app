import { useMemo, useState } from 'react';
import { useMovementsQuery, useAccountsQuery } from '../../hooks/queries';
import { PREDEFINED_CATEGORIES, getCategoryColor } from '../../constants/categories';
import { formatCurrencyAmount } from '../ui/CurrencyAmount';
import type { Movement } from '../../types';

interface TopExpensesProps {
  startDate: string;
  endDate: string;
}

const EXPENSE_TYPES = ['EgresoNormal', 'EgresoFijo'];
const TOP_N = 20;

const TopExpenses = ({ startDate, endDate }: TopExpensesProps) => {
  const [categoryFilter, setCategoryFilter] = useState('');
  const { data: movements, isLoading: movementsLoading } = useMovementsQuery();
  const { data: accounts } = useAccountsQuery();

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts?.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const topExpenses = useMemo(() => {
    if (!movements) return [];

    return movements
      .filter((m: Movement) => {
        if (!EXPENSE_TYPES.includes(m.type)) return false;
        if (m.isPending || m.isOrphaned) return false;
        if (m.displayedDate < startDate || m.displayedDate > endDate) return false;
        if (categoryFilter && m.category !== categoryFilter) return false;
        return true;
      })
      .sort((a: Movement, b: Movement) => b.amount - a.amount)
      .slice(0, TOP_N);
  }, [movements, startDate, endDate, categoryFilter]);

  if (movementsLoading) {
    return (
      <div className="animate-pulse space-y-3 py-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-surface-container-high rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-outline-variant rounded-md bg-surface-container-highest text-on-surface"
        >
          <option value="">All Categories</option>
          {PREDEFINED_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {topExpenses.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <p className="text-lg font-medium">No expenses found</p>
          <p className="text-sm mt-1">No expense movements match the selected filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-on-surface-variant">
                <th className="pb-2 font-medium w-8">#</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Notes</th>
                <th className="pb-2 font-medium">Account</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {topExpenses.map((m, idx) => (
                <tr key={m.id} className="border-b border-white/[0.04]">
                  <td className="py-2 text-on-surface-variant font-mono">{idx + 1}</td>
                  <td className="py-2 font-mono">{m.displayedDate}</td>
                  <td className="py-2">
                    {m.category && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${getCategoryColor(m.category)}20`, color: getCategoryColor(m.category) }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(m.category) }} />
                        {m.category}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-on-surface-variant max-w-[200px] truncate">
                    {m.notes || '—'}
                  </td>
                  <td className="py-2 text-on-surface-variant">
                    {accountMap.get(m.accountId) || '—'}
                  </td>
                  <td className="py-2 text-right font-medium text-[#ffb4ab] font-mono">
                    {formatCurrencyAmount(m.amount, 'USD')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TopExpenses;
