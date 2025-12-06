/**
 * Net Worth Timeline Widget
 * Displays a line chart of the user's net worth over time
 */

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNetWorthSnapshotsQuery } from '../../hooks/queries/useNetWorthSnapshotQueries';
import { useSettingsQuery } from '../../hooks/queries';
import Card from '../Card';
import Button from '../Button';
import { TrendingUp } from 'lucide-react';
import { format, parseISO, subDays, subMonths, subYears } from 'date-fns';

type ViewMode = 'total' | 'breakdown';
type DateRange = '30d' | '6m' | '1y' | 'all';

const NetWorthTimelineWidget = () => {
    const { data: snapshots = [], isLoading } = useNetWorthSnapshotsQuery();
    const { data: settings } = useSettingsQuery();
    const [viewMode, setViewMode] = useState<ViewMode>('total');
    const [dateRange, setDateRange] = useState<DateRange>('6m');

    const primaryCurrency = settings?.primaryCurrency || 'USD';

    // Filter snapshots by date range
    const filteredSnapshots = useMemo(() => {
        if (snapshots.length === 0) return [];

        const now = new Date();
        let startDate: Date;

        switch (dateRange) {
            case '30d':
                startDate = subDays(now, 30);
                break;
            case '6m':
                startDate = subMonths(now, 6);
                break;
            case '1y':
                startDate = subYears(now, 1);
                break;
            case 'all':
            default:
                startDate = new Date(0);
                break;
        }

        return snapshots.filter(s => parseISO(s.snapshotDate) >= startDate);
    }, [snapshots, dateRange]);

    // Prepare chart data
    const chartData = useMemo(() => {
        return filteredSnapshots.map(snapshot => ({
            date: format(parseISO(snapshot.snapshotDate), 'MMM d'),
            fullDate: snapshot.snapshotDate,
            total: snapshot.totalNetWorth,
            ...snapshot.breakdown
        }));
    }, [filteredSnapshots]);

    // Get all unique currencies from breakdown for multi-line chart
    const currencies = useMemo(() => {
        const allCurrencies = new Set<string>();
        snapshots.forEach(s => {
            Object.keys(s.breakdown || {}).forEach(c => allCurrencies.add(c));
        });
        return Array.from(allCurrencies);
    }, [snapshots]);

    // Color palette for currencies
    const currencyColors: Record<string, string> = {
        USD: '#22c55e',
        EUR: '#3b82f6',
        GBP: '#a855f7',
        MXN: '#f97316',
        COP: '#eab308',
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: primaryCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (isLoading) {
        return (
            <Card className="h-80">
                <div className="animate-pulse h-full bg-gray-100 dark:bg-gray-800 rounded" />
            </Card>
        );
    }

    if (snapshots.length === 0) {
        return (
            <Card className="h-80 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-center font-medium">No net worth data yet</p>
                <p className="text-sm text-center mt-1 opacity-75">
                    Snapshots will appear here once you start tracking
                </p>
            </Card>
        );
    }

    return (
        <Card>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Net Worth Timeline
                </h3>
                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                            onClick={() => setViewMode('total')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'total'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Total
                        </button>
                        <button
                            onClick={() => setViewMode('breakdown')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'breakdown'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            By Currency
                        </button>
                    </div>
                </div>
            </div>

            {/* Date Range Selector */}
            <div className="flex gap-2 mb-4">
                {(['30d', '6m', '1y', 'all'] as DateRange[]).map(range => (
                    <Button
                        key={range}
                        variant={dateRange === range ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setDateRange(range)}
                    >
                        {range === '30d' ? '30 Days' : range === '6m' ? '6 Months' : range === '1y' ? '1 Year' : 'All Time'}
                    </Button>
                ))}
            </div>

            {/* Chart */}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            className="text-gray-600 dark:text-gray-400"
                        />
                        <YAxis
                            tickFormatter={formatCurrency}
                            tick={{ fontSize: 12 }}
                            width={80}
                            className="text-gray-600 dark:text-gray-400"
                        />
                        <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{
                                backgroundColor: 'var(--tooltip-bg, #fff)',
                                borderColor: 'var(--tooltip-border, #e5e7eb)',
                                borderRadius: '8px',
                            }}
                        />
                        <Legend />

                        {viewMode === 'total' ? (
                            <Line
                                type="monotone"
                                dataKey="total"
                                name="Net Worth"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                            />
                        ) : (
                            currencies.map(currency => (
                                <Line
                                    key={currency}
                                    type="monotone"
                                    dataKey={currency}
                                    name={currency}
                                    stroke={currencyColors[currency] || '#8884d8'}
                                    strokeWidth={2}
                                    dot={{ fill: currencyColors[currency] || '#8884d8', strokeWidth: 2 }}
                                />
                            ))
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Latest Value */}
            {chartData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Latest snapshot: {chartData[chartData.length - 1].fullDate}
                        </span>
                        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(chartData[chartData.length - 1].total)}
                        </span>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default NetWorthTimelineWidget;
