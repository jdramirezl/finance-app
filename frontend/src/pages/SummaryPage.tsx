import { useMemo, useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import {
  useAccountsQuery,
  useFixedExpenseGroupsQuery,
  useMovementsQuery,
  usePocketsQuery,
  useSettingsQuery,
  useSpendingSummaryQuery,
  useSubPocketsQuery,
} from '../hooks/queries';
import { useAutoNetWorthSnapshot } from '../hooks/useAutoNetWorthSnapshot';
import { useConsolidatedTotal } from '../hooks/useConsolidatedTotal';
import { useInvestmentPrices } from '../hooks/useInvestmentPrices';
import { useSlowQuery } from '../hooks/useSlowQuery';
import { useToast } from '../hooks/useToast';
import { currencyService, type BatchConversionRequest } from '../services/currencyService';
import type { Currency } from '../types';
import type { PeriodSummary } from '../services/movementService';
import EmptyState from '../components/ui/EmptyState';
import SlowQueryIndicator from '../components/feedback/SlowQueryIndicator';
import {
  SkeletonAccountCard,
  SkeletonList,
  SkeletonStats,
} from '../components/ui/Skeleton';
import { ErrorBoundary } from '../components/feedback';
import QueryErrorCard from '../components/feedback/QueryErrorCard';
import FinancialCalendarWidget from '../components/summary/FinancialCalendarWidget';
import NetWorthTimelineWidget from '../components/net-worth/NetWorthTimelineWidget';
import RemindersWidget from '../components/reminders/RemindersWidget';
import NetWorthHero from '../components/summary/NetWorthHero';
import SpendingDensityCard from '../components/summary/SpendingDensityCard';
import CapitalBreakdown from '../components/summary/CapitalBreakdown';
import FixedObligationsWidget from '../components/summary/FixedObligationsWidget';
import FloatingActionBar from '../components/summary/FloatingActionBar';
import FloatingStatsBar from '../components/summary/FloatingStatsBar';
import { SelectionProvider } from '../contexts/SelectionContext';

/** Convert a multi-currency PeriodSummary to a single primary-currency amount. */
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

const SummaryPage = () => {
  // Data queries
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    isError: accountsIsError,
    error: accountsError,
    refetch: accountsRefetch,
  } = useAccountsQuery();
  const {
    data: pockets = [],
    isLoading: pocketsLoading,
    isError: pocketsIsError,
    error: pocketsError,
    refetch: pocketsRefetch,
  } = usePocketsQuery();
  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsIsError,
    error: settingsError,
    refetch: settingsRefetch,
  } = useSettingsQuery();
  const {
    data: subPockets = [],
    isLoading: subPocketsLoading,
    isError: subPocketsIsError,
    error: subPocketsError,
    refetch: subPocketsRefetch,
  } = useSubPocketsQuery();
  const {
    data: fixedExpenseGroups = [],
    isError: fixedExpenseGroupsIsError,
    error: fixedExpenseGroupsError,
    refetch: fixedExpenseGroupsRefetch,
  } = useFixedExpenseGroupsQuery();
  const { data: movements = [] } = useMovementsQuery();
  const { data: spendingData } = useSpendingSummaryQuery();

  const toast = useToast();
  const primaryCurrency = settings?.primaryCurrency || 'USD';

  // Investment prices
  const { investmentData } = useInvestmentPrices({ accounts, pockets, toast });

  // Consolidated totals
  const {
    totalsByCurrency,
    consolidatedTotal,
    isConsolidatedReady,
  } = useConsolidatedTotal({ accounts, primaryCurrency, investmentData });

  // Auto-snapshot
  useAutoNetWorthSnapshot({ consolidatedTotal, totalsByCurrency, isConsolidatedReady });

  // Fixed expenses derived data
  const fixedSubPockets = useMemo(() => {
    const fixedPockets = pockets.filter((p) => p.type === 'fixed');
    return subPockets.filter((sp) =>
      fixedPockets.some((fp) => fp.id === sp.pocketId)
    );
  }, [pockets, subPockets]);

  // Today's spending for the floating bar
  const [todaySpending, setTodaySpending] = useState(0);
  useEffect(() => {
    if (!spendingData) return;
    let cancelled = false;
    convertPeriodTotal(spendingData.today, primaryCurrency).then((val) => {
      if (!cancelled) setTodaySpending(val);
    });
    return () => { cancelled = true; };
  }, [spendingData, primaryCurrency]);

  // Loading state
  const isLoading =
    accountsLoading || pocketsLoading || settingsLoading || subPocketsLoading;
  const isSlow = useSlowQuery(isLoading);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonAccountCard />
          <SkeletonAccountCard />
        </div>
        <SkeletonList items={4} />
        {isSlow && <SlowQueryIndicator />}
      </div>
    );
  }

  return (
    <SelectionProvider>
      <div className="grid grid-cols-12 gap-6 h-full max-w-[1600px] mx-auto w-full pb-24">
        {/* LEFT COLUMN: Net Worth + Spending + Accounts */}
        <section className="col-span-12 lg:col-span-7 flex flex-col gap-6 lg:h-full lg:overflow-hidden">
          {/* Net Worth Hero */}
          <ErrorBoundary>
            {accountsIsError || settingsIsError ? (
              <div className="space-y-2">
                {accountsIsError && (
                  <QueryErrorCard title="accounts" error={accountsError} onRetry={() => accountsRefetch()} />
                )}
                {settingsIsError && (
                  <QueryErrorCard title="settings" error={settingsError} onRetry={() => settingsRefetch()} />
                )}
              </div>
            ) : (
              <NetWorthHero
                consolidatedTotal={consolidatedTotal}
                primaryCurrency={primaryCurrency}
                totalsByCurrency={totalsByCurrency}
                accountCount={accounts.length}
                isConsolidatedReady={isConsolidatedReady}
              />
            )}
          </ErrorBoundary>

          {/* Spending Density */}
          <ErrorBoundary>
            <SpendingDensityCard primaryCurrency={primaryCurrency} />
          </ErrorBoundary>

          {/* Liquidity Pools (scrollable account list) */}
          <ErrorBoundary>
            {accountsIsError || pocketsIsError ? (
              <div className="space-y-2">
                {accountsIsError && (
                  <QueryErrorCard title="accounts" error={accountsError} onRetry={() => accountsRefetch()} />
                )}
                {pocketsIsError && (
                  <QueryErrorCard title="pockets" error={pocketsError} onRetry={() => pocketsRefetch()} />
                )}
              </div>
            ) : (
              <CapitalBreakdown
                accounts={accounts}
                pockets={pockets}
                investmentData={investmentData}
                primaryCurrency={primaryCurrency}
              />
            )}
          </ErrorBoundary>
        </section>

        {/* RIGHT COLUMN: Calendar + Growth Matrix + Reminders + Fixed Commitments */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-6 lg:h-full lg:overflow-hidden">
          {/* Cashflow Forecast (Calendar) */}
          <ErrorBoundary>
            <FinancialCalendarWidget primaryCurrency={primaryCurrency} />
          </ErrorBoundary>

          {/* Growth Matrix (Net Worth Timeline) */}
          <ErrorBoundary>
            <NetWorthTimelineWidget />
          </ErrorBoundary>

          {/* Pending Reminders */}
          <ErrorBoundary>
            <RemindersWidget />
          </ErrorBoundary>

          {/* Fixed Commitments */}
          <ErrorBoundary>
            {subPocketsIsError || fixedExpenseGroupsIsError ? (
              <div className="space-y-2">
                {subPocketsIsError && (
                  <QueryErrorCard title="sub-pockets" error={subPocketsError} onRetry={() => subPocketsRefetch()} />
                )}
                {fixedExpenseGroupsIsError && (
                  <QueryErrorCard title="fixed expense groups" error={fixedExpenseGroupsError} onRetry={() => fixedExpenseGroupsRefetch()} />
                )}
              </div>
            ) : fixedSubPockets.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No fixed expenses yet"
                description="Create fixed expenses to track your recurring bills."
              />
            ) : (
              <FixedObligationsWidget
                subPockets={fixedSubPockets}
                groups={fixedExpenseGroups}
                primaryCurrency={primaryCurrency}
              />
            )}
          </ErrorBoundary>
        </section>

        {/* Floating Action Bar (always visible on desktop) */}
        <FloatingActionBar
          accounts={accounts}
          movements={movements}
          todaySpending={todaySpending}
          primaryCurrency={primaryCurrency}
        />

        {/* Selection stats bar (appears on top when items selected) */}
        <FloatingStatsBar primaryCurrency={primaryCurrency} />
      </div>
    </SelectionProvider>
  );
};

export default SummaryPage;
