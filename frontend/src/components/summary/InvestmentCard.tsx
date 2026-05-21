import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Account } from '../../types';
import { currencyService } from '../../services/currencyService';
import { TrendingUp, RefreshCw, BarChart3, DollarSign, Percent, Clock } from 'lucide-react';
import Button from '../ui/Button';
import { formatDistanceToNow } from 'date-fns';
import SelectableValue from '../ui/SelectableValue';

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
    /**
     * Receives the account so the parent can hold a stable callback (via
     * useCallback) instead of creating `onRefresh={() => refresh(account)}`
     * per row.
     */
    onRefresh: (account: Account) => void;
    isRefreshing: boolean;
}

/**
 * Renders an investment account card on the summary page. Memoized so
 * refreshing one investment's price does not re-render every other
 * account/CD card on the page.
 */
const InvestmentCard = ({
    account,
    data,
    onRefresh,
    isRefreshing,
}: InvestmentCardProps) => {
    const navigate = useNavigate();

    const handleAccountClick = () => {
        navigate(`/accounts?id=${account.id}`);
    };

    const stockSymbol = account.stockSymbol || 'N/A';
    // Use corrected values from data if available, otherwise fall back to account
    const montoInvertido = data?.montoInvertido ?? account.montoInvertido ?? 0;
    const shares = data?.shares ?? account.shares ?? 0;

    // Get performance status
    const getPerformanceStatus = () => {
        if (!data) return { text: 'Loading', color: 'text-on-surface-variant' };
        if (data.gainsPct > 10) return { text: 'Excellent', color: 'text-emerald-400' };
        if (data.gainsPct > 5) return { text: 'Good', color: 'text-emerald-400' };
        if (data.gainsPct > 0) return { text: 'Positive', color: 'text-emerald-400' };
        if (data.gainsPct > -5) return { text: 'Slight Loss', color: 'text-tertiary' };
        return { text: 'Loss', color: 'text-red-400' };
    };

    const performanceStatus = getPerformanceStatus();

    return (
        <div className="bg-surface-container-high/50 rounded-lg p-4 border-l-4" style={{ borderColor: account.color }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={handleAccountClick}
                    title="View Account Details"
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${account.color}20`, border: `2px solid ${account.color}` }}
                    >
                        <TrendingUp className="w-5 h-5" style={{ color: account.color }} aria-hidden="true" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg text-on-surface group-hover:text-primary">
                                {account.name}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${performanceStatus.color} bg-surface-container-highest`}>
                                {performanceStatus.text}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                            <BarChart3 className="w-3 h-3" aria-hidden="true" />
                            <span>Investment • {stockSymbol}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-on-surface">
                        <SelectableValue id={`inv-total-${account.id}`} value={data?.totalValue ?? account.balance} currency={account.currency}>
                            {currencyService.formatCurrency(data?.totalValue ?? account.balance, account.currency)}
                        </SelectableValue>
                    </div>
                    <div className="text-sm text-on-surface-variant">
                        Current Value
                    </div>
                </div>
            </div>

            {!data ? (
                <div className="flex items-center justify-center py-8 text-on-surface-variant">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                    Loading investment data...
                </div>
            ) : (
                <>
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-surface-container rounded-lg p-3 border border-outline-variant text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Percent className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />
                                <span className="text-sm font-medium text-on-surface-variant">Gains</span>
                            </div>
                            <div className={`text-lg font-bold font-mono ${data.gainsPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {data.gainsPct >= 0 ? '+' : ''}{data.gainsPct.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-surface-container rounded-lg p-3 border border-outline-variant text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />
                                <span className="text-sm font-medium text-on-surface-variant">P&L</span>
                            </div>
                            <div className={`text-lg font-bold font-mono ${data.gainsUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                <SelectableValue id={`inv-gains-${account.id}`} value={data.gainsUSD} currency={account.currency}>
                                    {data.gainsUSD >= 0 ? '+' : ''}{currencyService.formatCurrency(data.gainsUSD, account.currency)}
                                </SelectableValue>
                            </div>
                        </div>
                    </div>

                    {/* Investment Details */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 px-3 bg-surface-container rounded-md border border-outline-variant">
                            <span className="text-sm font-medium text-on-surface-variant">Total Invested</span>
                            <span className="font-mono font-semibold text-on-surface">
                                <SelectableValue id={`inv-invested-${account.id}`} value={montoInvertido} currency={account.currency}>
                                    {currencyService.formatCurrency(montoInvertido, account.currency)}
                                </SelectableValue>
                            </span>
                        </div>

                        <div className="flex items-center justify-between py-2 px-3 bg-surface-container rounded-md border border-outline-variant">
                            <span className="text-sm font-medium text-on-surface-variant">Total Shares</span>
                            <span className="font-mono font-semibold text-on-surface">
                                {shares.toFixed(6)}
                            </span>
                        </div>

                        <div className="flex items-center justify-between py-2 px-3 bg-surface-container rounded-md border border-outline-variant">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-on-surface-variant">Share Price</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRefresh(account)}
                                    loading={isRefreshing}
                                    disabled={isRefreshing}
                                    className="p-1 h-6 w-6"
                                    aria-label={`Refresh ${account.stockSymbol || 'investment'} share price`}
                                    title="Refresh share price"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                                </Button>
                            </div>
                            <span className="font-mono font-semibold text-on-surface">
                                {currencyService.formatCurrency(data.precioActual, account.currency)}
                            </span>
                        </div>

                        {data.lastUpdated && (
                            <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant pt-2">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                <span className="font-mono">Last updated {formatDistanceToNow(data.lastUpdated, { addSuffix: true })}</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default memo(InvestmentCard);
