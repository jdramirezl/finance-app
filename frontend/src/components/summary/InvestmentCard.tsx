import type { Account } from '../../types';
import { currencyService } from '../../services/currencyService';
import { TrendingUp, RefreshCw, BarChart3, DollarSign, Percent, Clock } from 'lucide-react';
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
    // Use corrected values from data if available, otherwise fall back to account
    const montoInvertido = data?.montoInvertido ?? account.montoInvertido ?? 0;
    const shares = data?.shares ?? account.shares ?? 0;

    // Get performance status
    const getPerformanceStatus = () => {
        if (!data) return { text: 'Loading', color: 'text-gray-600 dark:text-gray-400' };
        if (data.gainsPct > 10) return { text: 'Excellent', color: 'text-green-600 dark:text-green-400' };
        if (data.gainsPct > 5) return { text: 'Good', color: 'text-green-600 dark:text-green-400' };
        if (data.gainsPct > 0) return { text: 'Positive', color: 'text-green-600 dark:text-green-400' };
        if (data.gainsPct > -5) return { text: 'Slight Loss', color: 'text-yellow-600 dark:text-yellow-400' };
        return { text: 'Loss', color: 'text-red-600 dark:text-red-400' };
    };

    const performanceStatus = getPerformanceStatus();

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border-l-4" style={{ borderColor: account.color }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${account.color}20`, border: `2px solid ${account.color}` }}
                    >
                        <TrendingUp className="w-5 h-5" style={{ color: account.color }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                {account.name}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${performanceStatus.color} bg-white dark:bg-gray-800`}>
                                {performanceStatus.text}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <BarChart3 className="w-3 h-3" />
                            <span>Investment • {stockSymbol}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                        <SelectableValue id={`inv-total-${account.id}`} value={data?.totalValue ?? account.balance} currency={account.currency}>
                            {currencyService.formatCurrency(data?.totalValue ?? account.balance, account.currency)}
                        </SelectableValue>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Current Value
                    </div>
                </div>
            </div>

            {!data ? (
                <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-2"></div>
                    Loading investment data...
                </div>
            ) : (
                <>
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Percent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gains</span>
                            </div>
                            <div className={`text-lg font-bold ${data.gainsPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {data.gainsPct >= 0 ? '+' : ''}{data.gainsPct.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">P&L</span>
                            </div>
                            <div className={`text-lg font-bold ${data.gainsUSD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                <SelectableValue id={`inv-gains-${account.id}`} value={data.gainsUSD} currency={account.currency}>
                                    {data.gainsUSD >= 0 ? '+' : ''}{currencyService.formatCurrency(data.gainsUSD, account.currency)}
                                </SelectableValue>
                            </div>
                        </div>
                    </div>

                    {/* Investment Details */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Invested</span>
                            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                <SelectableValue id={`inv-invested-${account.id}`} value={montoInvertido} currency={account.currency}>
                                    {currencyService.formatCurrency(montoInvertido, account.currency)}
                                </SelectableValue>
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Shares</span>
                            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                {shares.toFixed(6)}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Share Price</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRefresh}
                                    loading={isRefreshing}
                                    disabled={isRefreshing}
                                    className="p-1 h-6 w-6"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                {currencyService.formatCurrency(data.precioActual, account.currency)}
                            </span>
                        </div>

                        {data.lastUpdated && (
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2">
                                <Clock className="w-3 h-3" />
                                <span>Last updated {formatDistanceToNow(data.lastUpdated, { addSuffix: true })}</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default InvestmentCard;
