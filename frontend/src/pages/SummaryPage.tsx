import { useMemo } from 'react';
import { Wallet } from 'lucide-react';
import {
  useAccountsQuery,
  useFixedExpenseGroupsQuery,
  usePocketsQuery,
  useSettingsQuery,
  useSubPocketsQuery,
} from '../hooks/queries';
import { useAutoNetWorthSnapshot } from '../hooks/useAutoNetWorthSnapshot';
import { useConsolidatedTotal } from '../hooks/useConsolidatedTotal';
import { useInvestmentPrices } from '../hooks/useInvestmentPrices';
import { useSlowQuery } from '../hooks/useSlowQuery';
import { useToast } from '../hooks/useToast';
import type { AccountCardDisplaySettings } from '../types';
import EmptyState from '../components/ui/EmptyState';
import SlowQueryIndicator from '../components/feedback/SlowQueryIndicator';
import PageHeader from '../components/ui/PageHeader';
import {
  SkeletonAccountCard,
  SkeletonList,
  SkeletonStats,
} from '../components/ui/Skeleton';
import { ErrorBoundary } from '../components/feedback';
import QueryErrorCard from '../components/feedback/QueryErrorCard';
import NetWorthTimelineWidget from '../components/net-worth/NetWorthTimelineWidget';
import RemindersWidget from '../components/reminders/RemindersWidget';
import {
  CurrencyBreakdownSection,
  FixedExpensesSummary,

  TotalsSummary,
} from '../components/summary';
import FloatingStatsBar from '../components/summary/FloatingStatsBar';
import { SelectionProvider } from '../contexts/SelectionContext';

const DEFAULT_DISPLAY: AccountCardDisplaySettings = {
  normal: 'detailed',
  investment: 'detailed',
  cd: 'detailed',
};

const SummaryPage = () => {
  // Data
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

  const toast = useToast();
  const primaryCurrency = settings?.primaryCurrency || 'USD';
  const accountCardDisplay = settings?.accountCardDisplay || DEFAULT_DISPLAY;

  // Investment prices and refresh handler
  const { investmentData, isRefreshing, handleRefreshPrice, getCacheInfo } =
    useInvestmentPrices({ accounts, pockets, toast });

  // Per-currency totals + consolidated total
  const {
    accountsByCurrency,
    sortedCurrencies,
    totalsByCurrency,
    consolidatedTotal,
    isConsolidatedReady,
  } = useConsolidatedTotal({ accounts, primaryCurrency, investmentData });

  // Auto-snapshot on load (consumes consolidated total to avoid race condition)
  useAutoNetWorthSnapshot({ consolidatedTotal, totalsByCurrency, isConsolidatedReady });

  // Fixed expenses derived data
  const { fixedSubPockets, totalFixedExpensesMoney } = useMemo(() => {
    const fixedPockets = pockets.filter((p) => p.type === 'fixed');
    const subs = subPockets.filter((sp) =>
      fixedPockets.some((fp) => fp.id === sp.pocketId)
    );
    const total = subs.reduce((sum, sp) => sum + sp.balance, 0);
    return { fixedSubPockets: subs, totalFixedExpensesMoney: total };
  }, [pockets, subPockets]);

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
      <div className="space-y-6">
        <PageHeader title="Summary" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left column: Total + Accounts */}
          <div className="space-y-6">
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
                <TotalsSummary
                  consolidatedTotal={consolidatedTotal}
                  primaryCurrency={primaryCurrency}
                  totalsByCurrency={totalsByCurrency}
                  isConsolidatedReady={isConsolidatedReady}
                />
              )}
            </ErrorBoundary>

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
                <CurrencyBreakdownSection
                  sortedCurrencies={sortedCurrencies}
                  accountsByCurrency={accountsByCurrency}
                  pockets={pockets}
                  investmentData={investmentData}
                  isRefreshing={isRefreshing}
                  getCacheInfo={getCacheInfo}
                  accountCardDisplay={accountCardDisplay}
                  onRefreshPrice={handleRefreshPrice}
                />
              )}
            </ErrorBoundary>
          </div>

          {/* Right column: Timeline + Widgets */}
          <div className="space-y-6">
            <ErrorBoundary>
              <NetWorthTimelineWidget />
            </ErrorBoundary>

            <ErrorBoundary>
              <div className="space-y-4 h-[550px]">
                <RemindersWidget />
              </div>
            </ErrorBoundary>

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
                <FixedExpensesSummary
                  subPockets={fixedSubPockets}
                  groups={fixedExpenseGroups}
                  accounts={accounts}
                  pockets={pockets}
                  totalMoney={totalFixedExpensesMoney}
                  primaryCurrency={primaryCurrency}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>

        <FloatingStatsBar primaryCurrency={primaryCurrency} />
      </div>
    </SelectionProvider>
  );
};

export default SummaryPage;
