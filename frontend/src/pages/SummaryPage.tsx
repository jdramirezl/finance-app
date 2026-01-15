import { useEffect, useState } from 'react';
import { useAccountsQuery, usePocketsQuery, useSettingsQuery, useSubPocketsQuery, useFixedExpenseGroupsQuery } from '../hooks/queries';
import { currencyService } from '../services/currencyService';
import { cdCalculationService } from '../services/cdCalculationService';
import { investmentService } from '../services/investmentService';
import type { Currency, Account, CDInvestmentAccount, AccountCardDisplaySettings } from '../types';
import { useToast } from '../hooks/useToast';
import { useAutoNetWorthSnapshot } from '../hooks/useAutoNetWorthSnapshot';
import { SkeletonStats, SkeletonAccountCard, SkeletonList } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { Wallet } from 'lucide-react';
import {
  TotalsSummary,
  CurrencySection,
  FixedExpensesSummary,
  type InvestmentData
} from '../components/summary';
import RemindersWidget from '../components/reminders/RemindersWidget';
import NetWorthTimelineWidget from '../components/net-worth/NetWorthTimelineWidget';
import FinancialCalendarWidget from '../components/calendar/FinancialCalendarWidget';
import { SelectionProvider } from '../context/SelectionContext';
import FloatingStatsBar from '../components/summary/FloatingStatsBar';

const SummaryPage = () => {
  // TanStack Query hooks
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsQuery();
  const { data: pockets = [], isLoading: pocketsLoading } = usePocketsQuery();
  const { data: settings, isLoading: settingsLoading } = useSettingsQuery();
  const { data: subPockets = [], isLoading: subPocketsLoading } = useSubPocketsQuery();
  const { data: fixedExpenseGroups = [] } = useFixedExpenseGroupsQuery();

  // Auto-snapshot on load
  useAutoNetWorthSnapshot();

  const [investmentData, setInvestmentData] = useState<Map<string, InvestmentData>>(new Map());
  const [, setLoadingInvestments] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState<Set<string>>(new Set());
  const toast = useToast();

  // Combine loading states
  const isLoading = accountsLoading || pocketsLoading || settingsLoading || subPocketsLoading;
  const error = null; // TanStack Query handles errors internally

  // Load investment prices
  useEffect(() => {
    const loadInvestmentPrices = async () => {
      const investmentAccounts = accounts.filter(acc => acc.type === 'investment' && acc.stockSymbol);
      if (investmentAccounts.length === 0) return;

      setLoadingInvestments(true);
      const newData = new Map<string, InvestmentData>();

      for (const account of investmentAccounts) {
        try {
          // Get fresh values from pocket balances (source of truth)
          const investedPocket = pockets.find(p => p.accountId === account.id && p.name === 'Invested Money');
          const sharesPocket = pockets.find(p => p.accountId === account.id && p.name === 'Shares');

          // Use pocket balances as source of truth instead of account fields
          const montoInvertido = investedPocket?.balance || 0;
          const shares = sharesPocket?.balance || 0;

          // Create a temporary account object with correct values
          const accountWithCorrectValues = {
            ...account,
            montoInvertido,
            shares,
          };

          if (account.stockSymbol) {
            const data = await investmentService.updateInvestmentAccount(accountWithCorrectValues);
            // Include the correct values in the data object
            newData.set(account.id, {
              ...data,
              montoInvertido,
              shares,
            });
          }
        } catch (error) {
          console.error(`Error loading price for ${account.stockSymbol}:`, error);
          // Use pocket balances for error case too
          const investedPocket = pockets.find(p => p.accountId === account.id && p.name === 'Invested Money');
          const sharesPocket = pockets.find(p => p.accountId === account.id && p.name === 'Shares');
          const montoInvertido = investedPocket?.balance || 0;
          const shares = sharesPocket?.balance || 0;
          newData.set(account.id, {
            precioActual: 0,
            totalValue: 0,
            gainsUSD: -montoInvertido,
            gainsPct: -100,
            lastUpdated: null,
            montoInvertido,
            shares,
          });
        }
      }

      setInvestmentData(newData);
      setLoadingInvestments(false);
    };

    loadInvestmentPrices();
  }, [accounts, pockets]);

  // Refresh price for a specific investment account
  const handleRefreshPrice = async (account: Account) => {
    if (!account.stockSymbol) return;

    setRefreshingPrices(prev => new Set(prev).add(account.id));

    try {
      // Get fresh values from pocket balances (same as initial load)
      const investedPocket = pockets.find(p => p.accountId === account.id && p.name === 'Invested Money');
      const sharesPocket = pockets.find(p => p.accountId === account.id && p.name === 'Shares');

      const montoInvertido = investedPocket?.balance || 0;
      const shares = sharesPocket?.balance || 0;

      // Create account with correct values
      const accountWithCorrectValues = {
        ...account,
        montoInvertido,
        shares,
      };

      const data = await investmentService.forceRefreshPrice(account.stockSymbol);
      const values = investmentService.calculateInvestmentValues(accountWithCorrectValues, data);
      const lastUpdated = investmentService.getPriceTimestamp(account.stockSymbol);

      setInvestmentData(prev => {
        const newMap = new Map(prev);
        newMap.set(account.id, {
          precioActual: data,
          ...values,
          lastUpdated,
          montoInvertido,
          shares,
        });
        return newMap;
      });

      toast.success(`Price refreshed: ${account.stockSymbol} = ${currencyService.formatCurrency(data, account.currency)}`);
    } catch (error) {
      console.error('Error refreshing price:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh price');
    } finally {
      setRefreshingPrices(prev => {
        const newSet = new Set(prev);
        newSet.delete(account.id);
        return newSet;
      });
    }
  };

  const primaryCurrency = settings?.primaryCurrency || 'USD';

  // Get account card display settings with defaults
  const accountCardDisplay: AccountCardDisplaySettings = settings?.accountCardDisplay || {
    normal: 'detailed',
    investment: 'detailed',
    cd: 'detailed'
  };

  // Helper to check if account is a CD
  const isCDAccount = (account: Account): account is CDInvestmentAccount => {
    // For CD accounts, we only need to check the type since investmentType might not be set correctly
    const isCD = account.type === 'cd';
    return isCD;
  };

  // Helper to get effective balance for any account type
  const getAccountBalance = (account: Account): number => {
    if (isCDAccount(account)) {
      // For CD accounts, use calculated current value
      try {
        // Check if account has all required CD fields
        if (!account.principal || !account.interestRate || !account.maturityDate) {
          return account.balance || 0;
        }

        const calculation = cdCalculationService.calculateCurrentValue(account);
        // Use net value if withholding tax is applied, otherwise use gross value
        const effectiveBalance = account.withholdingTaxRate && account.withholdingTaxRate > 0 
          ? calculation.netCurrentValue 
          : calculation.currentValue;
        return effectiveBalance;
      } catch (error) {
        console.warn('❌ Failed to calculate CD value, falling back to account balance:', error);
        return account.balance || 0;
      }
    }
    
    // For stock/ETF investment accounts, use calculated totalValue from investmentData
    if (account.type === 'investment' && account.stockSymbol) {
      const data = investmentData.get(account.id);
      if (data) {
        return data.totalValue;
      }
      return account.balance || 0;
    }
    
    // For normal accounts, use the regular balance
    return account.balance;
  };

  // Group accounts by currency
  const accountsByCurrency = accounts.reduce((acc, account) => {
    if (!acc[account.currency]) {
      acc[account.currency] = [];
    }
    acc[account.currency].push(account);
    return acc;
  }, {} as Record<Currency, Account[]>);

  // Calculate total by currency using effective balance
  const getTotalByCurrency = (currency: Currency): number => {
    const currencyAccounts = accountsByCurrency[currency] || [];
    let total = currencyAccounts.reduce((sum, account) => sum + getAccountBalance(account), 0);
    return total;
  };

  // Calculate consolidated total (all currencies converted to primary)
  const [consolidatedTotal, setConsolidatedTotal] = useState<number>(0);

  useEffect(() => {
    const calculateTotal = async () => {
      console.log('💰 ===== CONSOLIDATED TOTAL CALCULATION =====');
      let total = 0;
      const validCurrencies = Object.keys(accountsByCurrency).filter(c => c && c.trim());
      const conversionDetails: Array<{
        currency: Currency;
        originalTotal: number;
        convertedTotal: number;
        rate: string;
      }> = [];

      for (const currency of validCurrencies) {
        const currencyTotal = getTotalByCurrency(currency as Currency);
        if (currencyTotal && currency) {
          const converted = await currencyService.convert(
            currencyTotal,
            currency as Currency,
            primaryCurrency
          );
          
          // Calculate conversion rate (1 base currency = X target currency)
          const rate = currencyTotal !== 0 ? converted / currencyTotal : 0;
          
          conversionDetails.push({
            currency: currency as Currency,
            originalTotal: currencyTotal,
            convertedTotal: converted,
            rate: `1 ${currency} = ${rate.toFixed(4)} ${primaryCurrency}`
          });
          
          total += converted;
        }
      }
      
      // Log detailed breakdown
      console.log('📊 Currency Breakdown:');
      conversionDetails.forEach(detail => {
        console.log(`  ${detail.currency}: ${currencyService.formatCurrency(detail.originalTotal, detail.currency)} → ${currencyService.formatCurrency(detail.convertedTotal, primaryCurrency)} (${detail.rate})`);
      });
      console.log(`\n💵 Final Consolidated Total: ${currencyService.formatCurrency(total, primaryCurrency)}`);
      console.log('============================================\n');
      
      setConsolidatedTotal(total);
    };

    if (accounts.length > 0) {
      calculateTotal();
    }
  }, [accounts, primaryCurrency, investmentData]);

  // Find fixed expenses pocket
  const fixedPocket = pockets.find((p) => p.type === 'fixed');
  const fixedSubPockets = fixedPocket
    ? subPockets.filter(sp => sp.pocketId === fixedPocket.id)
    : [];
  const fixedAccount = fixedPocket
    ? accounts.find((acc) => acc.id === fixedPocket.accountId)
    : null;

  // Calculate total money in fixed expenses
  const totalFixedExpensesMoney = fixedSubPockets.reduce(
    (sum, sp) => sum + sp.balance,
    0
  );

  // Sort accounts: investment first, then by currency
  const sortedCurrencies = Object.keys(accountsByCurrency).sort((a, b) => {
    const aHasInvestment = accountsByCurrency[a as Currency].some((acc) => acc.type === 'investment');
    const bHasInvestment = accountsByCurrency[b as Currency].some((acc) => acc.type === 'investment');
    if (aHasInvestment && !bHasInvestment) return -1;
    if (!aHasInvestment && bHasInvestment) return 1;
    return a.localeCompare(b);
  });

  // Prepare totals map for TotalsSummary
  const totalsByCurrency = sortedCurrencies.reduce((acc, currency) => {
    acc[currency as Currency] = getTotalByCurrency(currency as Currency);
    return acc;
  }, {} as Record<Currency, number>);

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">⚠️</div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">Error Loading Data</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
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

        {/* Main Summary - Totals by Currency */}
        <TotalsSummary
          consolidatedTotal={consolidatedTotal}
          primaryCurrency={primaryCurrency}
          totalsByCurrency={totalsByCurrency}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accounts Section */}
          <div className="space-y-4">
            {sortedCurrencies.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No accounts yet"
                description="Create your first account to see your summary."
              />
            ) : (
              <div className="space-y-4">
                {sortedCurrencies.map((currency) => (
                  <CurrencySection
                    key={currency}
                    currency={currency as Currency}
                    accounts={accountsByCurrency[currency as Currency]}
                    pockets={pockets}
                    investmentData={investmentData}
                    refreshingPrices={refreshingPrices}
                    onRefreshPrice={handleRefreshPrice}
                    normalAccountDisplayMode={accountCardDisplay.normal}
                    investmentAccountDisplayMode={accountCardDisplay.investment}
                    cdAccountDisplayMode={accountCardDisplay.cd}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Financial Calendar */}
            <FinancialCalendarWidget primaryCurrency={primaryCurrency} />

            {/* Net Worth Timeline */}
            <NetWorthTimelineWidget />

            {/* Reminders Section */}
            <div className="space-y-4 h-[400px]">
              <RemindersWidget />
            </div>

            {/* Fixed Expenses Section */}
            <div className="space-y-4">
              {!fixedPocket ? (
                <EmptyState
                  icon={Wallet}
                  title="No fixed expenses pocket"
                  description="Create a fixed expenses pocket to track your recurring bills."
                />
              ) : (
                <FixedExpensesSummary
                  subPockets={fixedSubPockets}
                  groups={fixedExpenseGroups}
                  account={fixedAccount || undefined}
                  totalMoney={totalFixedExpensesMoney}
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
