/**
 * Net Worth Timeline Widget
 *
 * Top-level orchestrator for the net-worth timeline card. Owns the query
 * subscriptions and the per-card UI controls (view mode, range chips,
 * variation toggle). Data shaping is delegated to `useNetWorthChartData`,
 * chart rendering to `NetWorthEChart` (in both `total` and `breakdown`
 * modes), and the click-to-edit/delete flow to `NetWorthEditModal`.
 *
 * Wave 4 changed the range controls from buttons that filtered the
 * dataset (`30d / 6m / 1y / All Time`) to chips that programmatically
 * drive the ECharts dataZoom slider (`1Y / 2Y / All / Custom`). The
 * widget now always fetches the full snapshot history and computes the
 * dataZoom start/end percentages from the active range so the user can
 * still see (and zoom out to) older data via the minimap.
 *
 * Wave 5 retired the Recharts-based `NetWorthChart` fallback. The
 * "By Currency" tab now renders the same `NetWorthEChart` as "Total",
 * passing `viewMode='breakdown'` plus a per-currency `currencyData`
 * array so the chart can build one colored line per currency.
 */

import { useMemo, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';

import {
    useNetWorthSnapshotsQuery,
} from '../../hooks/queries/useNetWorthSnapshotQueries';
import { useSettingsQuery } from '../../hooks/queries';
import {
    useNetWorthChartData,
    type NetWorthViewMode,
    CURRENCY_LINE_COLORS,
} from '../../hooks/useNetWorthChartData';
import Card from '../ui/Card';
import CurrencyAmount from '../ui/CurrencyAmount';
import NetWorthEChart, {
    type CurrencySeriesData,
} from './NetWorthEChart';
import NetWorthEditModal, {
    type NetWorthEditModalHandle,
} from './NetWorthEditModal';
import NetWorthRangeControls, {
    type NetWorthRange,
} from './NetWorthRangeControls';
import ExchangeRateTrend from './ExchangeRateTrend';

type WidgetTab = NetWorthViewMode | 'rates';

/** Fallback color for currencies missing from the configured palette. */
const DEFAULT_LINE_COLOR = '#8884d8';

/**
 * Approximate number of monthly snapshots covered by each preset. Used
 * by the index-based fallback when computing the dataZoom window for
 * `1y` / `2y`. Time-based math always wins when the data spans an
 * actual time range; this constant only matters for sparse datasets
 * where index ≈ time.
 */
const POINTS_PER_YEAR = 12;

interface ZoomRange {
    start: number;
    end: number;
}

const FULL_RANGE: ZoomRange = { start: 0, end: 100 };

/**
 * Compute the dataZoom slider percentages for the given range against
 * the chart data. Percentages map to the x-axis (time) extent: 0% =
 * earliest snapshot, 100% = latest snapshot.
 *
 * - `all`: show everything.
 * - `1y` / `2y`: pick the timestamp of the snapshot N positions from the
 *   end (12 / 24) and convert that to a percentage of the time range.
 *   Index-based selection matches the user-visible promise ("last year"
 *   ≈ "the last 12 monthly snapshots") while still expressing the
 *   answer in the time-based percentages dataZoom expects.
 * - `custom`: convert the YYYY-MM From/To strings to timestamps (first
 *   day of From, last instant of To) and project them onto the data
 *   extent. Out-of-range pickers clamp to [0, 100] so the slider never
 *   exceeds the data extent.
 */
export const calculateZoomRange = (
    timestamps: number[],
    range: NetWorthRange,
    customFrom?: string,
    customTo?: string,
): ZoomRange => {
    if (timestamps.length === 0) return FULL_RANGE;
    if (range === 'all') return FULL_RANGE;

    const min = timestamps[0];
    const max = timestamps[timestamps.length - 1];
    const span = max - min;
    if (span === 0) return FULL_RANGE;

    const pctOf = (ts: number) => ((ts - min) / span) * 100;

    if (range === '3m' || range === '6m' || range === '1y' || range === '2y') {
        const windowMap = { '3m': 3, '6m': 6, '1y': POINTS_PER_YEAR, '2y': POINTS_PER_YEAR * 2 };
        const window = windowMap[range];
        const idx = Math.max(0, timestamps.length - window);
        return { start: pctOf(timestamps[idx]), end: 100 };
    }

    if (range === 'custom') {
        if (!customFrom || !customTo) return FULL_RANGE;

        // `YYYY-MM` from `<input type="month">`. Use UTC to avoid the
        // selected month sliding across the local-time boundary on
        // hosts whose timezone offset would put 'YYYY-MM-01' into the
        // previous month.
        const [fromYear, fromMonth] = customFrom.split('-').map(Number);
        const [toYear, toMonth] = customTo.split('-').map(Number);
        if (
            !Number.isFinite(fromYear) ||
            !Number.isFinite(fromMonth) ||
            !Number.isFinite(toYear) ||
            !Number.isFinite(toMonth)
        ) {
            return FULL_RANGE;
        }
        const fromTs = Date.UTC(fromYear, fromMonth - 1, 1);
        // Last instant of To-month: first instant of next month minus 1 ms.
        const toTs = Date.UTC(toYear, toMonth, 1) - 1;
        if (toTs <= fromTs) return FULL_RANGE;

        return {
            start: Math.max(0, Math.min(100, pctOf(fromTs))),
            end: Math.max(0, Math.min(100, pctOf(toTs))),
        };
    }

    return FULL_RANGE;
};

const NetWorthTimelineWidget = () => {
    const { data: snapshots = [], isLoading } = useNetWorthSnapshotsQuery();
    const { data: settings } = useSettingsQuery();

    const [viewMode, setViewMode] = useState<WidgetTab>('total');
    // The chips drive the chart's dataZoom slider rather than filtering
    // the snapshot list, so the data hook always asks for the full
    // history. `activeRange` is purely a view/zoom concern.
    const [activeRange, setActiveRange] = useState<NetWorthRange>('1y');
    const [customFrom, setCustomFrom] = useState<string>('');
    const [customTo, setCustomTo] = useState<string>('');
    const [showVariation, setShowVariation] = useState(false);

    const editModalRef = useRef<NetWorthEditModalHandle>(null);

    const primaryCurrency = settings?.primaryCurrency || 'USD';

    const { chartData, currencies } = useNetWorthChartData({
        snapshots,
        primaryCurrency,
        // Always fetch the full range; visual scoping is handled by the
        // chips + dataZoom in total mode and by the natural time axis in
        // breakdown mode.
        dateRange: 'all',
        viewMode: viewMode === 'rates' ? 'total' : viewMode,
        // The chart computes window-relative variation internally so it can
        // anchor the percentage axis on the FIRST VISIBLE point (which only
        // the chart knows via its dataZoom state). Pass `false` here so the
        // hook always returns raw absolute values; the `showVariation` UI
        // toggle flows directly into the chart prop below.
        showVariation: false,
    });

    // Resolve the snapshot the user clicked. Prefer matching by id (the
    // canonical identifier) and fall back to the snapshot date string so
    // the click still works for legacy datums that didn't carry an id.
    // After Wave 5 the only chart implementation is NetWorthEChart, so
    // this signature targets `NetWorthEChartDatum` directly via the
    // structural shape both Total and Breakdown modes carry.
    const handlePointClick = (datum: {
        snapshotId: string;
        fullDate: string;
    }) => {
        const snapshotId = datum.snapshotId;
        const snapshot =
            snapshots.find((s) => s.id === snapshotId) ||
            snapshots.find((s) => s.snapshotDate === datum.fullDate);

        if (snapshot) {
            editModalRef.current?.open(snapshot);
        }
    };

    // Memoize the EChart data adapter so the option's useMemo dependency
    // (NetWorthEChart memoizes its option keyed on `data`) doesn't get
    // invalidated by a fresh array reference on every parent render.
    const echartData = useMemo(
        () =>
            chartData.map((d) => ({
                date: d.fullDate,
                total: d.total ?? 0,
                snapshotId: d.snapshotId,
                fullDate: d.fullDate,
            })),
        [chartData],
    );

    // Wave 5: build per-currency series for the EChart in breakdown
    // mode. The hook already populated `chartData[i][currency]` with
    // the converted value (in `primaryCurrency`) and
    // `chartData[i][${currency}_native]` with the native amount, so the
    // mapping below is just a reshaping step. We only build it when the
    // breakdown view is selected to avoid a wasted allocation on every
    // total-mode render.
    const currencyData = useMemo<CurrencySeriesData[] | undefined>(() => {
        if (viewMode !== 'breakdown') return undefined;
        return currencies.map((currency) => ({
            currency,
            values: chartData.map(
                (d) => (d[currency] as number | undefined) ?? 0,
            ),
            nativeValues: chartData.map(
                (d) => (d[`${currency}_native`] as number | undefined) ?? 0,
            ),
            color: CURRENCY_LINE_COLORS[currency] || DEFAULT_LINE_COLOR,
        }));
    }, [viewMode, currencies, chartData]);

    // Compute zoom percentages from the EChart data so the dataZoom
    // window matches what the chart is actually rendering. Memoized on
    // the inputs that affect the result so unchanged chip selections
    // keep dispatching identical values (which is a no-op on the
    // chart) instead of fresh objects that would re-trigger the
    // chart's effect.
    const zoomRange = useMemo(() => {
        const timestamps = echartData.map((d) =>
            new Date(d.fullDate).getTime(),
        );
        return calculateZoomRange(timestamps, activeRange, customFrom, customTo);
    }, [echartData, activeRange, customFrom, customTo]);

    const handleRangeChange = (
        range: NetWorthRange,
        from?: string,
        to?: string,
    ) => {
        setActiveRange(range);
        if (range === 'custom') {
            // Defensive: NetWorthRangeControls only emits `custom` once
            // both inputs are set, but storing whatever it gives us is
            // safer than asserting non-null here.
            setCustomFrom(from ?? '');
            setCustomTo(to ?? '');
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
                    <NetWorthRangeControls
                        activeRange={activeRange}
                        onRangeChange={handleRangeChange}
                        initialCustomFrom={customFrom}
                        initialCustomTo={customTo}
                    />

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
                <NetWorthEChart
                    data={echartData}
                    primaryCurrency={primaryCurrency}
                    showVariation={showVariation}
                    onPointClick={handlePointClick}
                    dataZoomStart={zoomRange.start}
                    dataZoomEnd={zoomRange.end}
                    viewMode={viewMode === 'breakdown' ? 'breakdown' : 'total'}
                    currencyData={currencyData}
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
