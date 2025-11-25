import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { currencyService } from '../services/currencyService';
import { investmentService } from '../services/investmentService';
import type { Currency, Account } from '../types';
import { TrendingUp } from 'lucide-react';
import { SkeletonStats, SkeletonAccountCard, SkeletonList } from '../components/Skeleton';

interface InvestmentData {
  precioActual: number;
  totalValue: number;
  gainsUSD: number;
  gainsPct: number;
}

const SummaryPage = () => {
  const {
    accounts,
    pockets,
    loadAccounts,
    loadPockets,
    loadSubPockets,
    getPocketsByAccount,
    getSubPocketsByPocket,
    settings,
    loadSettings,
  } = useFinanceStore();

  const [investmentData, setInvestmentData] = useState<Map<string, InvestmentData>>(new Map());
  const [, setLoadingInvestments] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // loadAccounts now loads accounts, pockets, and subPockets in one call
        await Promise.all([
          loadAccounts(),
          loadSettings(),
        ]);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadAccounts, loadSettings]);

  // Load investment prices
  useEffect(() => {
    const loadInvestmentPrices = async () => {
      const investmentAccounts = accounts.filter(acc => acc.type === 'investment' && acc.stockSymbol);
      if (investmentAccounts.length === 0) return;

      setLoadingInvestments(true);
      const newData = new Map<string, InvestmentData>();

      for (const account of investmentAccounts) {
        try {
          if (account.stockSymbol) {
            const data = await investmentService.updateInvestmentAccount(account);
            newData.set(account.id, data);
          }
        } catch (error) {
          console.error(`Error loading price for ${account.stockSymbol}:`, error);
          // Use cached or default values
          const montoInvertido = account.montoInvertido || 0;
          newData.set(account.id, {
            precioActual: 0,
            totalValue: 0,
            gainsUSD: -montoInvertido,
            gainsPct: -100,
          });
        }
      }

      setInvestmentData(newData);
      setLoadingInvestments(false);
    };

    loadInvestmentPrices();
  }, [accounts]);

  const primaryCurrency = settings.primaryCurrency || 'USD';

  // Group accounts by currency
  const accountsByCurrency = accounts.reduce((acc, account) => {
    if (!acc[account.currency]) {
      acc[account.currency] = [];
    }
    acc[account.currency].push(account);
    return acc;
  }, {} as Record<Currency, Account[]>);

  // Calculate total by currency
  const getTotalByCurrency = (currency: Currency): number => {
    const currencyAccounts = accountsByCurrency[currency] || [];
    let total = currencyAccounts.reduce((sum, account) => sum + account.balance, 0);

    // For USD, include investment gains if any
    if (currency === 'USD') {
      // TODO: Add investment gains calculation when investment service is implemented
      // const investmentAccounts = currencyAccounts.filter((acc) => acc.type === 'investment');
    }

    return total;
  };

  // Calculate consolidated total (all currencies converted to primary)
  const getConsolidatedTotal = (): number => {
    return Object.keys(accountsByCurrency).reduce((total, currency) => {
      const currencyTotal = getTotalByCurrency(currency as Currency);
      const converted = currencyService.convertAmount(
        currencyTotal,
        currency as Currency,
        primaryCurrency
      );
      return total + converted;
    }, 0);
  };

  // Get progress color for fixed expenses
  const getProgressColor = (progress: number): string => {
    if (progress === 0) return 'bg-red-500';
    if (progress < 50) return 'bg-orange-500';
    if (progress < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Find fixed expenses pocket
  const fixedPocket = pockets.find((p) => p.type === 'fixed');
  const fixedSubPockets = fixedPocket ? getSubPocketsByPocket(fixedPocket.id) : [];
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Summary</h1>

      {/* Main Summary - Totals by Currency */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Consolidated Total - At the top */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-6 shadow-sm">
          <div className="text-sm text-blue-700 dark:text-blue-300 mb-1 font-medium">
            Total ({primaryCurrency})
          </div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {currencyService.formatCurrency(getConsolidatedTotal(), primaryCurrency)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            All currencies converted
          </div>
        </div>

        {/* Individual Currency Totals */}
        {sortedCurrencies.map((currency) => {
          const total = getTotalByCurrency(currency as Currency);
          return (
            <div
              key={currency}
              className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 shadow-sm"
            >
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total ({currency})</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {currencyService.formatCurrency(total, currency as Currency)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Accounts</h2>

          {sortedCurrencies.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
              No accounts yet. Create your first account!
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCurrencies.map((currency) => {
                const currencyAccounts = accountsByCurrency[currency as Currency];
                // Sort: investment first, then others
                const sortedAccounts = [...currencyAccounts].sort((a, b) => {
                  if (a.type === 'investment' && b.type !== 'investment') return -1;
                  if (a.type !== 'investment' && b.type === 'investment') return 1;
                  return 0;
                });

                return (
                  <div key={currency} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
                      {currency}
                    </div>
                    <div className="space-y-4">
                      {sortedAccounts.map((account) => {
                        const accountPockets = getPocketsByAccount(account.id);

                        return (
                          <div key={account.id} className="border-l-4 pl-4" style={{ borderColor: account.color }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: account.color }}
                                />
                                <span className="font-semibold text-lg">{account.name}</span>
                                {account.type === 'investment' && (
                                  <TrendingUp className="w-4 h-4 text-purple-600" />
                                )}
                              </div>
                              <span className="font-mono text-lg font-semibold">
                                {currencyService.formatCurrency(
                                  account.balance,
                                  account.currency
                                )}
                              </span>
                            </div>

                            {/* Investment Account Special Display */}
                            {account.type === 'investment' ? (
                              <div className="ml-5 space-y-2 text-sm">
                                {(() => {
                                  const invData = investmentData.get(account.id);
                                  const montoInvertido = account.montoInvertido || 0;
                                  const shares = account.shares || 0;
                                  const stockSymbol = account.stockSymbol || 'N/A';
                                  
                                  if (!invData) {
                                    return (
                                      <div className="text-gray-500 dark:text-gray-400 italic">
                                        Loading investment data...
                                      </div>
                                    );
                                  }

                                  return (
                                    <>
                                      <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                        {account.name} - {stockSymbol} | {currencyService.formatCurrency(invData.totalValue, account.currency)}
                                      </div>
                                      <div className="space-y-1 text-gray-700 dark:text-gray-300">
                                        <div className="flex justify-between">
                                          <span>Total money invested:</span>
                                          <span className="font-mono">{currencyService.formatCurrency(montoInvertido, account.currency)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Total shares:</span>
                                          <span className="font-mono">{shares.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Current share price:</span>
                                          <span className="font-mono">{currencyService.formatCurrency(invData.precioActual, account.currency)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Gains %:</span>
                                          <span className={`font-mono font-semibold ${invData.gainsPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {invData.gainsPct >= 0 ? '+' : ''}{invData.gainsPct.toFixed(2)}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Total money gained:</span>
                                          <span className={`font-mono font-semibold ${invData.gainsUSD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {invData.gainsUSD >= 0 ? '+' : ''}{currencyService.formatCurrency(invData.gainsUSD, account.currency)}
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              /* Normal Account - Show Pockets */
                              <div className="ml-5 space-y-1">
                                {accountPockets.map((pocket) => {
                                  return (
                                    <div
                                      key={pocket.id}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <span className="text-gray-700 dark:text-gray-300">
                                        {pocket.name}
                                        {pocket.type === 'fixed' && (
                                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(fixed)</span>
                                        )}
                                      </span>
                                      <span className="font-mono text-gray-900 dark:text-gray-100">
                                        {currencyService.formatCurrency(
                                          pocket.balance,
                                          pocket.currency
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Expenses Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Fixed Expenses</h2>

          {!fixedPocket ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
              No fixed expenses pocket found
            </div>
          ) : fixedSubPockets.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
              No fixed expenses yet
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
              {/* Total Summary */}
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total in Fixed Expenses</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {currencyService.formatCurrency(
                    totalFixedExpensesMoney,
                    fixedAccount?.currency || 'USD'
                  )}
                </div>
              </div>

              {/* Fixed Expenses Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Contributed
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Target
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {fixedSubPockets.map((subPocket) => {
                      const progress = subPocket.valueTotal > 0
                        ? Math.min((subPocket.balance / subPocket.valueTotal) * 100, 100)
                        : 0;
                      const progressColor = getProgressColor(progress);
                      const isDisabled = !subPocket.enabled;

                      return (
                        <tr 
                          key={subPocket.id} 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                            isDisabled ? 'opacity-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-2">
                              <span className={isDisabled ? 'line-through' : ''}>
                                {subPocket.name}
                              </span>
                              {isDisabled && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {currencyService.formatCurrency(
                              subPocket.balance,
                              fixedAccount?.currency || 'USD'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {currencyService.formatCurrency(
                              subPocket.valueTotal,
                              fixedAccount?.currency || 'USD'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 min-w-[80px]">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${progressColor}`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px]">
                                {progress.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
