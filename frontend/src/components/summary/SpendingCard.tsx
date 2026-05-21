import { useMemo, useState, useEffect } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useSpendingSummaryQuery } from '../../hooks/queries';
import { currencyService, type BatchConversionRequest } from '../../services/currencyService';
import type { Currency } from '../../types';
import type { PeriodSummary } from '../../services/movementService';
import { Skeleton } from '../ui/Skeleton';

interface SpendingCardProps {
  primaryCurrency: Currency;
}

type Period = 'week' | 'today' | 'month';

/** Sum a PeriodSummary's multi-currency totals into a single primary-currency amount. */
async function convertPeriodTotal(
  period: PeriodSummary,
  primaryCurrency: Currency
): Promise<number> {
  if (period.totals.length === 0) return 0;

  const sameCurrency = period.totals.filter(t => t.currency === primaryCurrency);
  const otherCurrency = period.totals.filter(t => t.currency !== primaryCurrency);

  const baseTotal = sameCurrency.reduce((sum, t) => sum + t.amount, 0);

  if (otherCurrency.length === 0) return baseTotal;

  const conversions: BatchConversionRequest[] = otherCurrency.map(t => ({
    amount: t.amount,
    from: t.currency,
    to: primaryCurrency,
  }));

  const results = await currencyService.convertBatch(conversions);
  const convertedTotal = results.reduce((sum, r) => sum + r.convertedAmount, 0);
  return baseTotal + convertedTotal;
}

function computePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

const PERIOD_CONFIG: Record<Period, { label: string; currentKey: 'today' | 'thisWeek' | 'thisMonth'; previousKey: 'today' | 'lastWeek' | 'lastMonth'; comparisonLabel: string }> = {
  today: { label: 'Today', currentKey: 'today', previousKey: 'today', comparisonLabel: '' },
  week: { label: 'This Week', currentKey: 'thisWeek', previousKey: 'lastWeek', comparisonLabel: 'vs last week' },
  month: { label: 'This Month', currentKey: 'thisMonth', previousKey: 'lastMonth', comparisonLabel: 'vs last month' },
};

const SpendingCard = ({ primaryCurrency }: SpendingCardProps) => {
  const { data, isLoading, isError } = useSpendingSummaryQuery();
  const [period, setPeriod] = useState<Period>('week');
  const [totals, setTotals] = useState<{ current: number; previous: number } | null>(null);
  const [converting, setConverting] = useState(false);

  const config = PERIOD_CONFIG[period];

  // Convert multi-currency totals whenever data or period changes
  useEffect(() => {
    if (!data) return;

    let cancelled = false;
    setConverting(true);

    const currentPeriod = data[config.currentKey];
    const previousPeriod = data[config.previousKey];

    Promise.all([
      convertPeriodTotal(currentPeriod, primaryCurrency),
      convertPeriodTotal(previousPeriod, primaryCurrency),
    ]).then(([current, previous]) => {
      if (!cancelled) {
        setTotals({ current, previous });
        setConverting(false);
      }
    });

    return () => { cancelled = true; };
  }, [data, period, primaryCurrency, config.currentKey, config.previousKey]);

  // Also compute today's total for the secondary line when period is week/month
  const [todayTotal, setTodayTotal] = useState<number | null>(null);
  useEffect(() => {
    if (!data || period === 'today') { setTodayTotal(null); return; }
    let cancelled = false;
    convertPeriodTotal(data.today, primaryCurrency).then(val => {
      if (!cancelled) setTodayTotal(val);
    });
    return () => { cancelled = true; };
  }, [data, primaryCurrency, period]);

  const percentChange = useMemo(() => {
    if (!totals || period === 'today') return null;
    return computePercentChange(totals.current, totals.previous);
  }, [totals, period]);

  if (isLoading || converting) {
    return (
      <div className="rounded-xl bg-surface-container border border-white/[0.08] backdrop-blur-xl p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-36 mb-2" />
        <Skeleton className="h-4 w-28" />
      </div>
    );
  }

  if (isError || !data || !totals) return null;

  const isIncrease = percentChange !== null && percentChange > 0;
  const isDecrease = percentChange !== null && percentChange < 0;

  return (
    <div className="rounded-xl bg-surface-container border border-white/[0.08] backdrop-blur-xl p-5">
      {/* Period toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
          Spending
        </span>
        <div className="flex gap-1">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-xs rounded-full font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {PERIOD_CONFIG[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary total */}
      <div className="text-2xl font-bold font-mono text-on-surface mb-1">
        {currencyService.formatCurrency(totals.current, primaryCurrency)}
      </div>

      {/* Secondary: today's spending when viewing week/month */}
      {todayTotal !== null && (
        <div className="text-sm font-mono text-on-surface-variant mb-2">
          Today: {currencyService.formatCurrency(todayTotal, primaryCurrency)}
        </div>
      )}

      {/* Comparison badge */}
      {percentChange !== null && (
        <div className={`inline-flex items-center gap-1 text-xs font-medium font-mono ${
          isDecrease ? 'text-emerald-400' : isIncrease ? 'text-red-400' : 'text-on-surface-variant'
        }`}>
          {isIncrease && <TrendingUp className="w-3 h-3" />}
          {isDecrease && <TrendingDown className="w-3 h-3" />}
          <span>
            {isIncrease ? '↑' : '↓'} {Math.abs(Math.round(percentChange))}% {config.comparisonLabel}
          </span>
        </div>
      )}
    </div>
  );
};

export default SpendingCard;
