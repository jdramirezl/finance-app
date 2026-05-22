/**
 * Net Worth Timeline Widget
 *
 * Top-level orchestrator for the net-worth timeline card. Owns the query
 * subscriptions and the per-card UI controls (view mode, date range,
 * variation toggle). Data shaping is delegated to `useNetWorthChartData`,
 * chart rendering to `NetWorthChart`, and the click-to-edit/delete flow
 * to `NetWorthEditModal`.
 */

import { useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';

import {
    useNetWorthSnapshotsQuery,
} from '../../hooks/queries/useNetWorthSnapshotQueries';
import { useSettingsQuery } from '../../hooks/queries';
import {
    useNetWorthChartData,
    type NetWorthChartDatum,
    type NetWorthDateRange,
    type NetWorthViewMode,
} from '../../hooks/useNetWorthChartData';
import Card from '../ui/Card';
import Button from '../ui/Button';
import CurrencyAmount from '../ui/CurrencyAmount';
import NetWorthChart from './NetWorthChart';
import NetWorthEditModal, {
    type NetWorthEditModalHandle,
} from './NetWorthEditModal';
import ExchangeRateTrend from './ExchangeRateTrend';

type WidgetTab = NetWorthViewMode | 'rates';

const NetWorthTimelineWidget = () => {
    const { data: snapshots = [], isLoading } = useNetWorthSnapshotsQuery();
    const { data: settings } = useSettingsQuery();

    const [viewMode, setViewMode] = useState<WidgetTab>('total');
    const [dateRange, setDateRange] = useState<NetWorthDateRange>('6m');
    const [showVariation, setShowVariation] = useState(false);

    const editModalRef = useRef<NetWorthEditModalHandle>(null);

    const primaryCurrency = settings?.primaryCurrency || 'USD';

    const { chartData, currencies, tooltipFormatter } = useNetWorthChartData({
        snapshots,
        primaryCurrency,
        dateRange,
        viewMode: viewMode === 'rates' ? 'total' : viewMode,
        showVariation,
    });

    // Resolve the snapshot the user clicked. Prefer matching by id (the
    // canonical identifier) and fall back to the snapshot date string so
    // the click still works for legacy datums that didn't carry an id.
    const handlePointClick = (datum: NetWorthChartDatum) => {
        const snapshotId = datum.snapshotId;
        const snapshot =
            snapshots.find((s) => s.id === snapshotId) ||
            snapshots.find((s) => s.snapshotDate === datum.fullDate);

        if (snapshot) {
            editModalRef.current?.open(snapshot);
        }
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

    const latestDatum =
        chartData.length > 0 ? chartData[chartData.length - 1] : null;

    return (
        <>
            <Card>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Net Worth Timeline
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <button
                                onClick={() => setViewMode('total')}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                    viewMode === 'total'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                Total
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('breakdown');
                                }}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                    viewMode === 'breakdown'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                By Currency
                            </button>
                            <button
                                onClick={() => setViewMode('rates')}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                    viewMode === 'rates'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                Rates
                            </button>
                        </div>
                    </div>
                </div>

                {/* Controls Row */}
                {viewMode === 'rates' ? (
                    <ExchangeRateTrend />
                ) : (
                <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex gap-2">
                        {(['30d', '6m', '1y', 'all'] as NetWorthDateRange[]).map(
                            (range) => (
                                <Button
                                    key={range}
                                    variant={dateRange === range ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setDateRange(range)}
                                >
                                    {range === '30d'
                                        ? '30 Days'
                                        : range === '6m'
                                          ? '6 Months'
                                          : range === '1y'
                                            ? '1 Year'
                                            : 'All Time'}
                                </Button>
                            ),
                        )}
                    </div>

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

                {/* Instruction */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                    💡 Click any point on the chart to edit or delete that snapshot
                </p>

                {/* Chart */}
                <NetWorthChart
                    chartData={chartData}
                    currencies={currencies}
                    viewMode={viewMode as NetWorthViewMode}
                    showVariation={showVariation}
                    primaryCurrency={primaryCurrency}
                    tooltipFormatter={tooltipFormatter}
                    onPointClick={handlePointClick}
                />

                {/* Latest Value */}
                {latestDatum && viewMode === 'total' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Latest snapshot: {latestDatum.fullDate}
                            </span>
                            <CurrencyAmount
                                amount={latestDatum.total ?? 0}
                                currency={primaryCurrency}
                                locale="en-US"
                                minimumFractionDigits={0}
                                maximumFractionDigits={0}
                                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>
                )}
                </>
                )}
            </Card>

            <NetWorthEditModal ref={editModalRef} />
        </>
    );
};

export default NetWorthTimelineWidget;
