import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useSpendingByCategoryQuery } from '../../hooks/queries';
import { getCategoryColor } from '../../constants/categories';
import { currencyService } from '../../services/currencyService';
import { Skeleton } from '../ui/Skeleton';
import type { Currency } from '../../types';

interface SpendingByCategoryProps {
  startDate: string;
  endDate: string;
}

const SpendingByCategory = ({ startDate, endDate }: SpendingByCategoryProps) => {
  const { data, isLoading } = useSpendingByCategoryQuery(startDate, endDate);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">No spending data</p>
        <p className="text-sm mt-1">No expenses found for this period.</p>
      </div>
    );
  }

  const currency = data.currency as Currency;
  const sorted = [...data.data].sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Donut Chart */}
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={sorted}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
            >
              {sorted.map((entry) => (
                <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => currencyService.formatCurrency(value, currency)}
            />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Total: {currencyService.formatCurrency(data.totalExpenses, currency)}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Amount</th>
              <th className="pb-2 font-medium text-right">Count</th>
              <th className="pb-2 font-medium text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.category} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: getCategoryColor(entry.category) }}
                  />
                  {entry.category}
                </td>
                <td className="py-2 text-right">
                  {currencyService.formatCurrency(entry.total, currency)}
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
