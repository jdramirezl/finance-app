import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useNetWorthSnapshotsQuery } from '../../hooks/queries';
import { currencyService } from '../../services/currencyService';
import type { Account, Currency } from '../../types';
import type { InvestmentData } from './InvestmentCard';
import { Skeleton } from '../ui/Skeleton';

interface NetWorthHeroProps {
  consolidatedTotal: number;
  primaryCurrency: Currency;
  totalsByCurrency: Record<Currency, number>;
  accountCount: number;
  isConsolidatedReady?: boolean;
  accounts?: Account[];
  investmentData?: Map<string, InvestmentData>;
}

const NetWorthHero = ({
  consolidatedTotal,
  primaryCurrency,
  totalsByCurrency,
  accountCount,
  isConsolidatedReady = true,
  accounts = [],
  investmentData = new Map(),
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

  // Categorize totals into CASH / STOCKS / LIQUID
  const categories = useMemo(() => {
    let cash = 0;
    let stocks = 0;
    let liquid = 0;

    for (const account of accounts) {
      if (account.type === 'investment') {
        const inv = investmentData.get(account.id);
        stocks += inv ? inv.totalValue : account.balance;
      } else if (account.type === 'cd') {
        liquid += account.balance;
      } else {
        cash += account.balance;
      }
    }

    return [
      { label: 'CASH', amount: cash, currency: primaryCurrency },
      { label: 'STOCKS', amount: stocks, currency: primaryCurrency, highlight: true },
      { label: 'LIQUID', amount: liquid, currency: primaryCurrency },
    ];
  }, [accounts, investmentData, primaryCurrency]);

  // Split the formatted number into integer and decimal parts
  const formatted = currencyService.formatCurrency(consolidatedTotal, primaryCurrency);
  const dotIndex = formatted.lastIndexOf('.');
  const integerPart = dotIndex >= 0 ? formatted.slice(0, dotIndex) : formatted;
  const decimalPart = dotIndex >= 0 ? formatted.slice(dotIndex) : '';

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-1">
            Global Net Worth
          </p>
          {isConsolidatedReady ? (
            <h2 className="font-mono text-4xl font-bold text-primary leading-tight">
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
                className={`font-mono text-sm px-2 py-1 rounded ${
                  percentChange >= 0
                    ? 'text-secondary bg-secondary/10'
                    : 'text-error bg-error/10'
                }`}
              >
                {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%{' '}
                {percentChange >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
              </span>
              <p className="text-xs text-on-surface-variant mt-2">vs last month</p>
            </>
          )}
        </div>
      </div>

      {/* Category breakdown pills: CASH / STOCKS / LIQUID */}
      <div className="grid grid-cols-3 gap-4 mt-6 border-t border-white/5 pt-4">
        {categories.map((cat) => (
          <div key={cat.label} className="text-center border-r border-white/5 last:border-r-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              {cat.label}
            </p>
            <p className={`font-mono text-sm font-bold ${cat.highlight ? 'text-primary' : 'text-on-surface'}`}>
              {currencyService.formatCurrency(cat.amount, cat.currency)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default NetWorthHero;
