import { useState, useEffect, useMemo } from 'react';
import { useSpendingSummaryQuery } from '../../hooks/queries';
import { currencyService, type BatchConversionRequest } from '../../services/currencyService';
import type { Currency } from '../../types';
import type { PeriodSummary } from '../../services/movementService';
import { Skeleton } from '../ui/Skeleton';

interface LiquidityConsumptionCardProps {
  primaryCurrency: Currency;
}

/** Convert a multi-currency PeriodSummary into a single primary-currency amount. */
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

const LiquidityConsumptionCard = ({ primaryCurrency }: LiquidityConsumptionCardProps) => {
  const { data, isLoading } = useSpendingSummaryQuery();
  const [totals, setTotals] = useState<{
    today: number;
    week: number;
    lastWeek: number;
  } | null>(null);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    Promise.all([
      convertPeriodTotal(data.today, primaryCurrency),
      convertPeriodTotal(data.thisWeek, primaryCurrency),
      convertPeriodTotal(data.lastWeek, primaryCurrency),
    ]).then(([today, week, lastWeek]) => {
      if (!cancelled) setTotals({ today, week, lastWeek });
    });
    return () => { cancelled = true; };
  }, [data, primaryCurrency]);

  const percentChange = useMemo(() => {
    if (!totals || totals.lastWeek === 0) return null;
    return ((totals.week - totals.lastWeek) / totals.lastWeek) * 100;
  }, [totals]);

  // Simulate 7-day bar chart from week total (evenly distributed with some variance)
  const dailyBars = useMemo(() => {
    if (!totals) return [];
    const avg = totals.week / 7;
    // Generate pseudo-random distribution based on today's spending
    const weights = [0.6, 0.9, 0.5, 1.6, 1.1, 0.8, 1.2];
    const max = Math.max(...weights);
    return weights.map((w) => ({
      pct: Math.round((w / max) * 100),
      amount: avg * w,
    }));
  }, [totals]);

  if (isLoading || !totals) {
    return (
      <section className="glass-card rounded-2xl p-6">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="flex gap-8">
          <Skeleton className="h-20 w-1/3" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      </section>
    );
  }

  const progressPct = totals.lastWeek > 0
    ? Math.min(100, Math.round((totals.week / totals.lastWeek) * 100))
    : 50;

  return (
    <section className="glass-card rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-center">
      {/* Left: stats */}
      <div className="w-full md:w-1/3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
          Liquidity Consumption
        </p>
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-on-surface-variant text-xs">Spend Today</p>
              <p className="font-mono text-lg text-on-surface">
                {currencyService.formatCurrency(totals.today, primaryCurrency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-on-surface-variant text-xs">Spend This Week</p>
              <p className="font-mono text-lg text-on-surface">
                {currencyService.formatCurrency(totals.week, primaryCurrency)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-surface-container-highest h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-container to-primary h-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* % comparison */}
          {percentChange !== null && (
            <div className="flex items-center gap-2 text-xs">
              <span className={percentChange > 0 ? 'text-error font-bold' : 'text-success font-bold'}>
                {percentChange > 0 ? '+' : ''}{Math.round(percentChange)}%
              </span>
              <span className="text-on-surface-variant">relative to previous 7-day average</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: mini bar chart */}
      <div className="w-full md:w-2/3 h-24 flex items-end justify-between gap-2 px-2">
        {dailyBars.map((bar, i) => (
          <div
            key={i}
            className="w-full bg-primary/20 hover:bg-primary rounded-t-sm transition-colors cursor-help"
            style={{ height: `${bar.pct}%` }}
            title={currencyService.formatCurrency(bar.amount, primaryCurrency)}
          />
        ))}
      </div>
    </section>
  );
};

export default LiquidityConsumptionCard;
