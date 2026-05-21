import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCategoryTrendQuery } from '../../hooks/queries/useReportsQueries';
import { PREDEFINED_CATEGORIES, getCategoryColor } from '../../constants/categories';
import { formatCurrencyAmount } from '../ui/CurrencyAmount';

interface CategoryTrendProps {
  months?: number;
}

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString('default', { month: 'short' });
}

const CategoryTrend = ({ months: initialMonths = 6 }: CategoryTrendProps) => {
  const [selectedCategory, setSelectedCategory] = useState(PREDEFINED_CATEGORIES[0]);
  const [months, setMonths] = useState(initialMonths);
  const { data: response, isLoading } = useCategoryTrendQuery(selectedCategory, months);

  const color = getCategoryColor(selectedCategory);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        >
          {PREDEFINED_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {[6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                months === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="animate-pulse space-y-4 py-8">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : !response?.data?.length ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm mt-1">No spending found for {selectedCategory} in this period.</p>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={response.data.map((d) => ({ ...d, label: formatMonth(d.month) }))} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v: number) => formatCurrencyAmount(v, response.currency, { maximumFractionDigits: 0 })}
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrencyAmount(value, response.currency),
                  selectedCategory,
                ]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CategoryTrend;
