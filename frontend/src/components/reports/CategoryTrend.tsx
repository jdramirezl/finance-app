import { useState, useEffect } from 'react';
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
import { useSettingsQuery } from '../../hooks/queries/useSettingsQuery';
import { PREDEFINED_CATEGORIES, getCategoryColor } from '../../constants/categories';
import { currencyService, type BatchConversionRequest } from '../../services/currencyService';
import type { CurrencyAmount } from '../../services/reportService';
import { formatCurrencyAmount } from '../ui/CurrencyAmount';
import { Skeleton } from '../ui/Skeleton';
import type { Currency } from '../../types';

interface CategoryTrendProps {
  months?: number;
}

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString('default', { month: 'short' });
}

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

interface ConvertedEntry {
  month: string;
  label: string;
  total: number;
  count: number;
}

const CategoryTrend = ({ months: initialMonths = 6 }: CategoryTrendProps) => {
  const [selectedCategory, setSelectedCategory] = useState(PREDEFINED_CATEGORIES[0]);
  const [months, setMonths] = useState(initialMonths);
  const { data: response, isLoading } = useCategoryTrendQuery(selectedCategory, months);
  const { data: settings } = useSettingsQuery();
  const [chartData, setChartData] = useState<ConvertedEntry[] | null>(null);
  const [converting, setConverting] = useState(false);

  const primaryCurrency = (settings?.primaryCurrency || 'USD') as Currency;
  const color = getCategoryColor(selectedCategory);

  useEffect(() => {
    if (!response?.data?.length) { setChartData(null); return; }
    let cancelled = false;
    setConverting(true);

    const conversions = response.data.map(entry =>
      convertTotals(entry.totals, primaryCurrency).then(total => ({
        month: entry.month,
        label: formatMonth(entry.month),
        total,
        count: entry.count,
      }))
    );

    Promise.all(conversions).then(results => {
      if (!cancelled) { setChartData(results); setConverting(false); }
    });

    return () => { cancelled = true; };
  }, [response, primaryCurrency]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-600 rounded-md bg-gray-900 text-gray-100"
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
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-900'
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading || converting ? (
        <div className="animate-pulse space-y-4 py-8">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !chartData?.length ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm mt-1">No spending found for {selectedCategory} in this period.</p>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v: number) => formatCurrencyAmount(v, primaryCurrency, { maximumFractionDigits: 0 })}
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrencyAmount(value, primaryCurrency),
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
