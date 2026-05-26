import { useNavigate } from 'react-router-dom';
import type { Account } from '../../types';
import { currencyService } from '../../services/currencyService';
import { TrendingUp, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import SelectableValue from '../ui/SelectableValue';
import type { InvestmentCacheInfo } from '../../hooks/useInvestmentPrices';
import { formatCacheLabel } from './investmentCacheLabel';

export interface InvestmentData {
    precioActual: number;
    totalValue: number;
    gainsUSD: number;
    gainsPct: number;
    lastUpdated: number | null;
    montoInvertido?: number; // Correct value from pocket balance
    shares?: number; // Correct value from pocket balance
}

interface InvestmentCardCompactProps {
    account: Account;
    data?: InvestmentData;
    /** Aligned with InvestmentCard so the parent can hold one stable handler. */
    onRefresh: (account: Account) => void;
    /** Symbol-keyed predicate — see InvestmentCard for the rationale. */
    isRefreshing: (accountId: string) => boolean;
    /** Cache freshness for the next-refresh hint. */
    getCacheInfo: (symbol: string) => InvestmentCacheInfo;
}

const InvestmentCardCompact = ({
    account,
    data,
    onRefresh,
    isRefreshing,
    getCacheInfo,
}: InvestmentCardCompactProps) => {
    const navigate = useNavigate();

    const handleAccountClick = () => {
        navigate(`/accounts?id=${account.id}`);
    };

    const stockSymbol = account.stockSymbol || 'N/A';
    // Use corrected values from data if available, otherwise fall back to account
    const montoInvertido = data?.montoInvertido ?? account.montoInvertido ?? 0;
    const shares = data?.shares ?? account.shares ?? 0;
    const refreshLabel = `Refresh ${stockSymbol} share price`;
    const refreshing = isRefreshing(account.id);
    const cacheLabel = account.stockSymbol
        ? formatCacheLabel(getCacheInfo(account.stockSymbol))
        : null;

    return (
        <div className="border-l-4 pl-4" style={{ borderColor: account.color }}>
            <div className="flex items-center justify-between mb-2">
                <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={handleAccountClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAccountClick();
                        }
                    }}
                    title="View Account Details"
                    aria-label={`View ${account.name} account details`}
                >
                    <div
                        className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
                        style={{ backgroundColor: account.color }}
                    />
                    <span className="font-semibold text-lg text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {account.name}
                    </span>
                    <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                </div>
                <span className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <SelectableValue id={`inv-total-${account.id}`} value={data?.totalValue ?? account.balance} currency={account.currency}>
                        {currencyService.formatCurrency(data?.totalValue ?? account.balance, account.currency)}
                    </SelectableValue>
                </span>
            </div>

            <div className="ml-5 space-y-2 text-sm">
                {!data ? (
                    <div className="text-gray-500 dark:text-gray-400 italic">
                        Loading investment data...
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {stockSymbol} | {currencyService.formatCurrency(data.totalValue, account.currency)}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRefresh(account)}
                                loading={refreshing}
                                disabled={refreshing}
                                className="ml-2"
                                aria-label={refreshLabel}
                                title={refreshLabel}
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                            </Button>
                        </div>

                        <div className="space-y-1 text-gray-700 dark:text-gray-300">
                            <div className="flex justify-between">
                                <span>Total money invested:</span>
                                <span className="font-mono">
                                    <SelectableValue id={`inv-invested-${account.id}`} value={montoInvertido} currency={account.currency}>
                                        {currencyService.formatCurrency(montoInvertido, account.currency)}
                                    </SelectableValue>
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total shares:</span>
                                <span className="font-mono">{shares.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Current share price:</span>
                                <span className="font-mono">
                                    {currencyService.formatCurrency(data.precioActual, account.currency)}
                                </span>
                            </div>

                            {cacheLabel && (
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 italic">
                                    <span>Last updated:</span>
                                    <span>{cacheLabel}</span>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <span>Gains %:</span>
                                <span className={`font-mono font-semibold ${data.gainsPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {data.gainsPct >= 0 ? '+' : ''}{data.gainsPct.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total money gained:</span>
                                <span className={`font-mono font-semibold ${data.gainsUSD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    <SelectableValue id={`inv-gains-${account.id}`} value={data.gainsUSD} currency={account.currency}>
                                        {data.gainsUSD >= 0 ? '+' : ''}{currencyService.formatCurrency(data.gainsUSD, account.currency)}
                                    </SelectableValue>
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default InvestmentCardCompact;
