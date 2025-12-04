import type { Account } from '../../types';
import { currencyService } from '../../services/currencyService';
import { TrendingUp, RefreshCw } from 'lucide-react';
import Button from '../Button';
import { formatDistanceToNow } from 'date-fns';

export interface InvestmentData {
    precioActual: number;
    totalValue: number;
    gainsUSD: number;
    gainsPct: number;
    lastUpdated: number | null;
}

interface InvestmentCardProps {
    account: Account;
    data?: InvestmentData;
    onRefresh: () => void;
    isRefreshing: boolean;
}

const InvestmentCard = ({
    account,
    data,
    onRefresh,
    isRefreshing,
}: InvestmentCardProps) => {
    const stockSymbol = account.stockSymbol || 'N/A';
    const montoInvertido = account.montoInvertido || 0;
    const shares = account.shares || 0;

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
                    {currencyService.formatCurrency(account.balance, account.currency)}
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
                                    {currencyService.formatCurrency(montoInvertido, account.currency)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total shares:</span>
                                <span className="font-mono">{shares.toFixed(4)}</span>
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
                                    {data.gainsUSD >= 0 ? '+' : ''}{currencyService.formatCurrency(data.gainsUSD, account.currency)}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default InvestmentCard;
