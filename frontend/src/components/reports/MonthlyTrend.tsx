import { useState, useEffect } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMonthlyTrendQuery } from '../../hooks/queries/useReportsQueries';
import { useSettingsQuery } from '../../hooks/queries/useSettingsQuery';
import { currencyService, type BatchConversionRequest } from '../../services/currencyService';
import type { CurrencyAmount } from '../../services/reportService';
import { formatCurrencyAmount } from '../ui/CurrencyAmount';
import { Skeleton } from '../ui/Skeleton';
import type { Currency } from '../../types';

interface MonthlyTrendProps {
  months: number;
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

interface ConvertedMonthly {
  month: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

const MonthlyTrend = ({ months }: MonthlyTrendProps) => {
  const { data: response, isLoading } = useMonthlyTrendQuery(months);
  const { data: settings } = useSettingsQuery();
  const [chartData, setChartData] = useState<ConvertedMonthly[] | null>(null);
  const [converting, setConverting] = useState(false);

  const primaryCurrency = (settings?.primaryCurrency || 'USD') as Currency;

  useEffect(() => {
    if (!response?.data?.length) { setChartData(null); return; }
    let cancelled = false;
    setConverting(true);

    const conversions = response.data.map(entry =>
      Promise.all([
        convertTotals(entry.income, primaryCurrency),
        convertTotals(entry.expenses, primaryCurrency),
      ]).then(([income, expenses]) => ({
        month: entry.month,
        label: formatMonth(entry.month),
        income,
        expenses,
        net: income - expenses,
      }))
    );

    Promise.all(conversions).then(results => {
      if (!cancelled) { setChartData(results); setConverting(false); }
    });

    return () => { cancelled = true; };
  }, [response, primaryCurrency]);

  if (isLoading || converting) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!chartData?.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg font-medium">No data available</p>
        <p className="text-sm mt-1">No transactions found for the selected period.</p>
      </div>
    );
  }

  const tickFormatter = (value: number) =>
    formatCurrencyAmount(value, primaryCurrency, { maximumFractionDigits: 0 });

  const tooltipFormatter = (value: number, name: string) => [
    formatCurrencyAmount(value, primaryCurrency),
    name,
  ];

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 12 }} width={80} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="net"
            name="Net"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyTrend;
