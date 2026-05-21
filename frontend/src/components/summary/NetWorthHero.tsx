import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useNetWorthSnapshotsQuery } from '../../hooks/queries';
import { currencyService } from '../../services/currencyService';
import type { Currency } from '../../types';
import { Skeleton } from '../ui/Skeleton';

interface NetWorthHeroProps {
  consolidatedTotal: number;
  primaryCurrency: Currency;
  totalsByCurrency: Record<Currency, number>;
  accountCount: number;
  isConsolidatedReady?: boolean;
}

const NetWorthHero = ({
  consolidatedTotal,
  primaryCurrency,
  totalsByCurrency,
  accountCount,
  isConsolidatedReady = true,
}: NetWorthHeroProps) => {
  const { data: snapshots = [] } = useNetWorthSnapshotsQuery();

  const currencies = Object.keys(totalsByCurrency) as Currency[];

  // Compute % change from previous month's snapshot
  const percentChange = useMemo(() => {
    if (snapshots.length < 2 || !isConsolidatedReady) return null;
    const sorted = [...snapshots].sort(
      (a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    );
    const previous = sorted[1];
    if (!previous || previous.totalNetWorth === 0) return null;
    return ((consolidatedTotal - previous.totalNetWorth) / previous.totalNetWorth) * 100;
  }, [snapshots, consolidatedTotal, isConsolidatedReady]);

  // Split the formatted number into integer and decimal parts
  const formatted = currencyService.formatCurrency(consolidatedTotal, primaryCurrency);
  const dotIndex = formatted.lastIndexOf('.');
  const integerPart = dotIndex >= 0 ? formatted.slice(0, dotIndex) : formatted;
  const decimalPart = dotIndex >= 0 ? formatted.slice(dotIndex) : '';

  return (
    <section className="relative overflow-hidden rounded-2xl glass-card p-8">
      {/* Decorative blur orb */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-2">
          Portfolio Total Net Worth
        </p>

        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
          {isConsolidatedReady ? (
            <h2 className="font-mono text-[48px] leading-none font-bold text-on-surface tracking-tight">
              {integerPart}
              <span className="opacity-50 font-normal">{decimalPart}</span>
            </h2>
          ) : (
            <Skeleton className="h-12 w-64" />
          )}

          {percentChange !== null && (
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                  percentChange >= 0
                    ? 'text-emerald-400 bg-emerald-400/10'
                    : 'text-red-400 bg-red-400/10'
                }`}
              >
                {percentChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(percentChange).toFixed(1)}%
              </div>
              <span className="text-on-surface-variant text-sm">since last month</span>
            </div>
          )}
        </div>

        <p className="text-on-surface-variant text-sm mt-4">
          Across {accountCount} account{accountCount !== 1 ? 's' : ''} in{' '}
          {currencies.length} {currencies.length === 1 ? 'currency' : 'currencies'}
        </p>

        {/* Currency breakdown pills */}
        <div className="flex flex-wrap gap-3 mt-6">
          {currencies.map((currency) => (
            <div
              key={currency}
              className="flex items-center gap-2 bg-surface-container-highest px-3 py-1.5 rounded-lg border border-white/5"
            >
              <span className="text-[10px] font-bold text-on-surface-variant">
                {currency}
              </span>
              <span className="font-mono text-sm text-on-surface">
                {currencyService.formatCurrency(totalsByCurrency[currency], currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NetWorthHero;
