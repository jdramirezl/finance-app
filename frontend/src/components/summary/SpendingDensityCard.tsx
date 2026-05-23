import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { useSpendingSummaryQuery } from '../../hooks/queries';
import { currencyService, type BatchConversionRequest } from '../../services/currencyService';
import type { Currency } from '../../types';
import type { PeriodSummary } from '../../services/movementService';
import { Skeleton } from '../ui/Skeleton';

interface SpendingDensityCardProps {
  primaryCurrency: Currency;
}

async function convertPeriodTotal(
  period: PeriodSummary,
  primaryCurrency: Currency
): Promise<number> {
  if (period.totals.length === 0) return 0;
  const same = period.totals.filter((t) => t.currency === primaryCurrency);
  const other = period.totals.filter((t) => t.currency !== primaryCurrency);
  const base = same.reduce((sum, t) => sum + t.amount, 0);
  if (other.length === 0) return base;
  const conversions: BatchConversionRequest[] = other.map((t) => ({
    amount: t.amount,
    from: t.currency,
    to: primaryCurrency,
  }));
  const results = await currencyService.convertBatch(conversions);
  return base + results.reduce((sum, r) => sum + r.convertedAmount, 0);
}

const SpendingDensityCard = ({ primaryCurrency }: SpendingDensityCardProps) => {
  const { data, isLoading } = useSpendingSummaryQuery();
  const [totals, setTotals] = useState<{ today: number; week: number; month: number } | null>(null);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    Promise.all([
      convertPeriodTotal(data.today, primaryCurrency),
      convertPeriodTotal(data.thisWeek, primaryCurrency),
      convertPeriodTotal(data.thisMonth, primaryCurrency),
    ]).then(([today, week, month]) => {
      if (!cancelled) setTotals({ today, week, month });
    });
    return () => { cancelled = true; };
  }, [data, primaryCurrency]);

  if (isLoading || !totals) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  // Progress bars: today as % of week, week as % of month, month vs a reasonable cap
  const todayPct = totals.week > 0 ? Math.min(100, Math.round((totals.today / (totals.week / 7)) * 100)) : 0;
  const weekPct = totals.month > 0 ? Math.min(100, Math.round((totals.week / totals.month) * 100)) : 0;
  // Month progress: % of month elapsed
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const monthElapsedPct = Math.round((dayOfMonth / daysInMonth) * 100);
  // If spending pace exceeds elapsed time, show warning color
  const monthPct = Math.min(100, monthElapsedPct > 0 ? Math.round((totals.month / (totals.month * (daysInMonth / dayOfMonth))) * 100) : 50);
  const monthOverpace = weekPct > monthElapsedPct;

  const periods = [
    { label: 'TODAY', amount: totals.today, pct: todayPct, warn: false },
    { label: 'THIS WEEK', amount: totals.week, pct: weekPct, warn: false },
    { label: 'THIS MONTH', amount: totals.month, pct: monthPct, warn: monthOverpace },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Spending Density
        </h3>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-gray-700 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-100 transition-colors">
            EXPORT
          </button>
          <button className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-500/20 transition-colors">
            ANALYSIS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {periods.map((p) => (
          <div
            key={p.label}
            className="bg-gray-700/50 p-4 rounded-lg border border-gray-700"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              {p.label}
            </p>
            <p className="text-lg font-semibold text-gray-100">
              {currencyService.formatCurrency(p.amount, primaryCurrency)}
            </p>
            <div className="w-full bg-gray-700 h-1 mt-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  p.warn ? 'bg-red-400' : 'bg-blue-400'
                }`}
                style={{ width: `${p.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpendingDensityCard;
