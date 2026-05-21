import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useSpendingByCategoryQuery } from '../../hooks/queries';
import { useSettingsQuery } from '../../hooks/queries/useSettingsQuery';
import { getCategoryColor } from '../../constants/categories';
import { currencyService, type BatchConversionRequest } from '../../services/currencyService';
import type { CurrencyAmount } from '../../services/reportService';
import { Skeleton } from '../ui/Skeleton';
import type { Currency } from '../../types';

interface SpendingByCategoryProps {
  startDate: string;
  endDate: string;
}

/** Convert a CurrencyAmount[] to a single amount in the primary currency. */
async function convertTotals(totals: CurrencyAmount[], primaryCurrency: Currency): Promise<number> {
  if (totals.length === 0) return 0;
  const same = totals.filter(t => t.currency === primaryCurrency);
  const other = totals.filter(t => t.currency !== primaryCurrency);
  const baseTotal = same.reduce((sum, t) => sum + t.amount, 0);
  if (other.length === 0) return baseTotal;
  const conversions: BatchConversionRequest[] = other.map(t => ({
    amount: t.amount, from: t.currency, to: primaryCurrency,
  }));
  const results = await currencyService.convertBatch(conversions);
  return baseTotal + results.reduce((sum, r) => sum + r.convertedAmount, 0);
}

interface ConvertedCategory {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

const SpendingByCategory = ({ startDate, endDate }: SpendingByCategoryProps) => {
  const { data, isLoading } = useSpendingByCategoryQuery(startDate, endDate);
  const { data: settings } = useSettingsQuery();
  const [converted, setConverted] = useState<{ data: ConvertedCategory[]; totalExpenses: number } | null>(null);
  const [converting, setConverting] = useState(false);

  const primaryCurrency = (settings?.primaryCurrency || 'USD') as Currency;

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setConverting(true);

    Promise.all([
      convertTotals(data.totalExpenses, primaryCurrency),
      ...data.data.map(entry => convertTotals(entry.totals, primaryCurrency)),
    ]).then(([totalExpenses, ...categoryTotals]) => {
      if (cancelled) return;
      const items = data.data.map((entry, i) => ({
        category: entry.category,
        total: categoryTotals[i],
        count: entry.count,
        percentage: totalExpenses > 0 ? Math.round((categoryTotals[i] / totalExpenses) * 10000) / 100 : 0,
      })).sort((a, b) => b.total - a.total);
      setConverted({ data: items, totalExpenses });
      setConverting(false);
    });

    return () => { cancelled = true; };
  }, [data, primaryCurrency]);

  if (isLoading || converting || !converted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (converted.data.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <p className="text-lg font-medium">No spending data</p>
        <p className="text-sm mt-1">No expenses found for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Donut Chart */}
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={converted.data}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
            >
              {converted.data.map((entry) => (
                <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => currencyService.formatCurrency(value, primaryCurrency)}
            />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-sm text-on-surface-variant mt-2">
          Total: {currencyService.formatCurrency(converted.totalExpenses, primaryCurrency)}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-on-surface-variant">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Amount</th>
              <th className="pb-2 font-medium text-right">Count</th>
              <th className="pb-2 font-medium text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {converted.data.map((entry) => (
              <tr key={entry.category} className="border-b border-white/[0.04]">
                <td className="py-2 flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: getCategoryColor(entry.category) }}
                  />
                  {entry.category}
                </td>
                <td className="py-2 text-right">
                  {currencyService.formatCurrency(entry.total, primaryCurrency)}
                </td>
                <td className="py-2 text-right">{entry.count}</td>
                <td className="py-2 text-right">{entry.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpendingByCategory;
