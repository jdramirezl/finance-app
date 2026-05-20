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
import { useToast } from '../hooks/useToast';
import type { AccountCardDisplaySettings } from '../types';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  SkeletonAccountCard,
  SkeletonList,
  SkeletonStats,
} from '../components/Skeleton';
import FinancialCalendarWidget from '../components/calendar/FinancialCalendarWidget';
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
  } = useAccountsQuery();
  const {
    data: pockets = [],
    isLoading: pocketsLoading,
    isError: pocketsIsError,
    error: pocketsError,
  } = usePocketsQuery();
  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsIsError,
    error: settingsError,
  } = useSettingsQuery();
  const {
    data: subPockets = [],
    isLoading: subPocketsLoading,
    isError: subPocketsIsError,
    error: subPocketsError,
  } = useSubPocketsQuery();
  const {
    data: fixedExpenseGroups = [],
    isError: fixedExpenseGroupsIsError,
    error: fixedExpenseGroupsError,
  } = useFixedExpenseGroupsQuery();

  // Auto-snapshot on load
  useAutoNetWorthSnapshot();

  const toast = useToast();
  const primaryCurrency = settings?.primaryCurrency || 'USD';
  const accountCardDisplay = settings?.accountCardDisplay || DEFAULT_DISPLAY;

  // Investment prices and refresh handler
  const { investmentData, refreshingPrices, handleRefreshPrice } =
    useInvestmentPrices({ accounts, pockets, toast });

  // Per-currency totals + consolidated total
  const {
    accountsByCurrency,
    sortedCurrencies,
    totalsByCurrency,
    consolidatedTotal,
    isConsolidatedReady,
  } = useConsolidatedTotal({ accounts, primaryCurrency, investmentData });

  // Fixed expenses derived data
  const { fixedSubPockets, totalFixedExpensesMoney } = useMemo(() => {
    const fixedPockets = pockets.filter((p) => p.type === 'fixed');
    const subs = subPockets.filter((sp) =>
      fixedPockets.some((fp) => fp.id === sp.pocketId)
    );
    const total = subs.reduce((sum, sp) => sum + sp.balance, 0);
    return { fixedSubPockets: subs, totalFixedExpensesMoney: total };
  }, [pockets, subPockets]);

  // Loading and error states
  const isLoading =
    accountsLoading || pocketsLoading || settingsLoading || subPocketsLoading;
  const isError =
    accountsIsError ||
    pocketsIsError ||
    settingsIsError ||
    subPocketsIsError ||
    fixedExpenseGroupsIsError;
  const queryError =
    accountsError ||
    pocketsError ||
    settingsError ||
    subPocketsError ||
    fixedExpenseGroupsError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonAccountCard />
          <SkeletonAccountCard />
        </div>
        <SkeletonList items={4} />
      </div>
    );
  }

  if (isError) {
    const errorMessage =
      queryError instanceof Error
        ? queryError.message
        : 'An unexpected error occurred while loading your data.';

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">⚠️</div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
            Error Loading Data
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <SelectionProvider>
      <div className="space-y-6">
        <PageHeader title="Summary" />

        <TotalsSummary
          consolidatedTotal={consolidatedTotal}
          primaryCurrency={primaryCurrency}
          totalsByCurrency={totalsByCurrency}
          isConsolidatedReady={isConsolidatedReady}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CurrencyBreakdownSection
            sortedCurrencies={sortedCurrencies}
            accountsByCurrency={accountsByCurrency}
            pockets={pockets}
            investmentData={investmentData}
            refreshingPrices={refreshingPrices}
            accountCardDisplay={accountCardDisplay}
            onRefreshPrice={handleRefreshPrice}
          />

          <div className="space-y-6">
            <FinancialCalendarWidget primaryCurrency={primaryCurrency} />
            <NetWorthTimelineWidget />

            <div className="space-y-4 h-[400px]">
              <RemindersWidget />
            </div>

            <div className="space-y-4">
              {fixedSubPockets.length === 0 ? (
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
            </div>
          </div>
        </div>

        <FloatingStatsBar primaryCurrency={primaryCurrency} />
      </div>
    </SelectionProvider>
  );
};

export default SummaryPage;
