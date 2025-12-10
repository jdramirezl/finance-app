/**
 * Net Worth Timeline Widget
 * Displays a line chart of the user's net worth over time
 */

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNetWorthSnapshotsQuery } from '../../hooks/queries/useNetWorthSnapshotQueries';
import { useSettingsQuery } from '../../hooks/queries';
import { currencyService } from '../../services/currencyService';
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
    const [showVariation, setShowVariation] = useState(false);

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

    // Prepare chart data
    const chartData = useMemo(() => {
        if (filteredSnapshots.length === 0) return [];

        // 1. First pass: Process raw values ensuring everything is in Primary Currency
        const processedSnapshots = filteredSnapshots.map(snapshot => {
            const data: any = {
                date: format(parseISO(snapshot.snapshotDate), 'MMM d'),
                fullDate: snapshot.snapshotDate,
                total: snapshot.totalNetWorth,
            };

            if (snapshot.breakdown) {
                Object.entries(snapshot.breakdown).forEach(([currency, value]) => {
                    // ALWAYS convert to primary currency for consistent scaling
                    if (currency !== primaryCurrency) {
                        const rate = currencyService.getExchangeRate(currency as any, primaryCurrency);
                        data[currency] = value * rate;
                    } else {
                        data[currency] = value;
                    }
                });
            }
            return data;
        });

        // 2. Second pass: Calculate variation if enabled
        if (showVariation) {
            const baseline = processedSnapshots[0];
            return processedSnapshots.map(snapshot => {
                const variationData: any = {
                    date: snapshot.date,
                    fullDate: snapshot.fullDate,
                    total: baseline.total !== 0
                        ? ((snapshot.total - baseline.total) / Math.abs(baseline.total)) * 100
                        : 0,
                    // Store original total for tooltip
                    total_original: snapshot.total,
                };

                // Process currencies
                if (viewMode === 'breakdown') {
                    currencies.forEach(currency => {
                        const baseVal = baseline[currency] || 0;
                        const currentVal = snapshot[currency] || 0;
                        variationData[currency] = baseVal !== 0
                            ? ((currentVal - baseVal) / Math.abs(baseVal)) * 100
                            : 0;
                        // Store original value for tooltip
                        variationData[`${currency}_original`] = currentVal;
                    });
                }

                return variationData;
            });
        }

        return processedSnapshots;
    }, [filteredSnapshots, viewMode, showVariation, primaryCurrency, currencies]);

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

            {/* Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                {/* Date Range Selector */}
                <div className="flex gap-2">
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

                {/* Variation Toggle (Available for both modes) */}
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={showVariation}
                        onChange={(e) => setShowVariation(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Show Variation (%)
                </label>
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
                            tickFormatter={(value) => showVariation ? `${value.toFixed(0)}%` : formatCurrency(value)}
                            tick={{ fontSize: 12 }}
                            width={showVariation ? 50 : 80}
                            className="text-gray-600 dark:text-gray-400"
                            domain={showVariation ? [-100, 100] : ['auto', 'auto']}
                        />
                        <Tooltip
                            formatter={(value: number, name: string, entry: any) => {
                                if (showVariation) {
                                    // Retrieve original value from payload
                                    // Key format: "currency_original" or "total_original"
                                    const originalKey = name === 'Net Worth' ? 'total_original' : `${name}_original`;
                                    const originalValue = entry.payload[originalKey];
                                    return [
                                        `${value.toFixed(2)}% (${originalValue !== undefined ? formatCurrency(originalValue) : 'N/A'})`,
                                        name
                                    ];
                                }
                                return [formatCurrency(value), name];
                            }}
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
            {chartData.length > 0 && viewMode === 'total' && (
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
