import type { Account } from '../../types';
import { currencyService } from '../../services/currencyService';
import { TrendingUp, RefreshCw } from 'lucide-react';
import Button from '../Button';
import { formatDistanceToNow } from 'date-fns';
import SelectableValue from '../SelectableValue';

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
    onRefresh: () => void;
    isRefreshing: boolean;
}

const InvestmentCardCompact = ({
    account,
    data,
    onRefresh,
    isRefreshing,
}: InvestmentCardCompactProps) => {
    const stockSymbol = account.stockSymbol || 'N/A';
    // Use corrected values from data if available, otherwise fall back to account
    const montoInvertido = data?.montoInvertido ?? account.montoInvertido ?? 0;
    const shares = data?.shares ?? account.shares ?? 0;

    return (
        <div className="border-l-4 pl-4" style={{ borderColor: account.color }}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                    />
                    <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {account.name}
                    </span>
                    <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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
                                onClick={onRefresh}
                                loading={isRefreshing}
                                disabled={isRefreshing}
                                className="ml-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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

                            {data.lastUpdated && (
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 italic">
                                    <span>Last updated:</span>
                                    <span>{formatDistanceToNow(data.lastUpdated, { addSuffix: true })}</span>
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