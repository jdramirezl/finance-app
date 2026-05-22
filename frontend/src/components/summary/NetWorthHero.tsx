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

  const currencyEntries = useMemo(
    () => (Object.entries(totalsByCurrency) as [Currency, number][]).filter(([, amt]) => amt !== 0),
    [totalsByCurrency]
  );

  // Split the formatted number into integer and decimal parts
  const formatted = currencyService.formatCurrency(consolidatedTotal, primaryCurrency);
  const dotIndex = formatted.lastIndexOf('.');
  const integerPart = dotIndex >= 0 ? formatted.slice(0, dotIndex) : formatted;
  const decimalPart = dotIndex >= 0 ? formatted.slice(dotIndex) : '';

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">
            Global Net Worth
          </p>
          {isConsolidatedReady ? (
            <h2 className="text-4xl font-bold text-blue-400 leading-tight">
              {integerPart}
              <span className="opacity-50">{decimalPart}</span>
            </h2>
          ) : (
            <Skeleton className="h-10 w-64" />
          )}
        </div>
        <div className="text-right">
          {percentChange !== null && (
            <>
              <span
                className={`text-sm px-2 py-1 rounded ${
                  percentChange >= 0
                    ? 'text-blue-300 bg-blue-300/10'
                    : 'text-red-400 bg-red-400/10'
                }`}
              >
                {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%{' '}
                {percentChange >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
              </span>
              <p className="text-xs text-gray-400 mt-2">vs last month</p>
            </>
          )}
        </div>
      </div>

      {/* Per-currency breakdown pills */}
      {currencyEntries.length > 1 && (
        <div className={`grid grid-cols-${Math.min(currencyEntries.length, 4)} gap-4 mt-6 border-t border-gray-700 pt-4`}>
          {currencyEntries.map(([currency, amount]) => (
            <div key={currency} className="text-center border-r border-gray-700 last:border-r-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                {currency}
              </p>
              <p className={`text-sm font-bold ${currency === primaryCurrency ? 'text-blue-400' : 'text-gray-100'}`}>
                {currencyService.formatCurrency(amount, currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default NetWorthHero;
