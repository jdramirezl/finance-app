/**
 * useNetWorthChartData
 *
 * Encapsulates the data-side concerns of the net-worth timeline chart:
 *  - filtering snapshots by the selected date range,
 *  - discovering the set of currencies present in the snapshot breakdowns,
 *  - fetching cross-currency exchange rates so foreign-currency totals can
 *    be projected into the user's primary currency, and
 *  - computing the chart datums for both `total` and `breakdown` modes
 *    (with the optional %-variation transform).
 *
 * Consumers receive a stable result shape regardless of mode — the chart
 * component reads `currencies` to know which series to render in
 * `breakdown` mode and ignores it in `total` mode.
 *
 * Wave 5 retired the Recharts `NetWorthChart` along with its tooltip
 * formatter. The active ECharts implementation builds its tooltip
 * inline against `NetWorthEChartDatum`, so the formatter helper that
 * previously lived here was removed.
 */

import { useMemo } from 'react';
import { format, parseISO, subDays, subMonths, subYears } from 'date-fns';

import { currencyService } from '../services/currencyService';
import type { NetWorthSnapshot } from '../services/netWorthSnapshotService';
import type { Currency } from '../types';

export type NetWorthViewMode = 'total' | 'breakdown';
export type NetWorthDateRange = '30d' | '6m' | '1y' | 'all';

/**
 * Color palette for currency lines in breakdown mode. Currencies not in
 * this map fall back to a neutral default in the chart component.
 */
export const CURRENCY_LINE_COLORS: Record<string, string> = {
    USD: '#22c55e',
    EUR: '#3b82f6',
    GBP: '#a855f7',
    MXN: '#f97316',
    COP: '#eab308',
};

/**
 * Shape of a chart datum produced by the hook. The keys vary by mode:
 * total mode populates `total`; breakdown mode populates per-currency keys
 * (e.g. `USD`, `EUR`); variation mode also adds `<key>_original`
 * companions holding the pre-variation absolute amount so the tooltip can
 * surface both the percentage and the original number.
 */
export type NetWorthChartDatum = {
    date: string;
    fullDate: string;
    snapshotId: string;
    total?: number;
    total_original?: number;
} & Record<string, string | number | undefined>;

export interface UseNetWorthChartDataParams {
    snapshots: NetWorthSnapshot[];
    primaryCurrency: string;
    dateRange: NetWorthDateRange;
    viewMode: NetWorthViewMode;
    showVariation: boolean;
}

export interface UseNetWorthChartDataResult {
    chartData: NetWorthChartDatum[];
    currencies: string[];
}

const filterByRange = (
    snapshots: NetWorthSnapshot[],
    dateRange: NetWorthDateRange,
): NetWorthSnapshot[] => {
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

    return snapshots.filter((s) => parseISO(s.snapshotDate) >= startDate);
};

export const useNetWorthChartData = ({
    snapshots,
    primaryCurrency,
    dateRange,
    viewMode,
    showVariation,
}: UseNetWorthChartDataParams): UseNetWorthChartDataResult => {
    const filteredSnapshots = useMemo(
        () => filterByRange(snapshots, dateRange),
        [snapshots, dateRange],
    );

    // Discover every currency that appears in any breakdown so the chart
    // can render one line per currency in `breakdown` mode and we know
    // which exchange rates to fetch for cross-currency normalization.
    const currencies = useMemo(() => {
        const allCurrencies = new Set<string>();
        snapshots.forEach((s) => {
            Object.keys(s.breakdown || {}).forEach((c) => allCurrencies.add(c));
        });
        return Array.from(allCurrencies);
    }, [snapshots]);

    const chartData = useMemo<NetWorthChartDatum[]>(() => {
        if (filteredSnapshots.length === 0) return [];

        const processedSnapshots: NetWorthChartDatum[] = filteredSnapshots.map(
            (snapshot) => {
                const data: NetWorthChartDatum = {
                    date: format(parseISO(snapshot.snapshotDate), 'MMM d'),
                    fullDate: snapshot.snapshotDate,
                    total: snapshot.totalNetWorth,
                    snapshotId: snapshot.id,
                };

                if (snapshot.breakdown) {
                    Object.entries(snapshot.breakdown).forEach(([currency, value]) => {
                        // Convert to primary currency for comparable Y-axis
                        data[currency] = currencyService.convertAmount(value, currency as Currency, primaryCurrency as Currency);
                        // Store native value for tooltip display
                        data[`${currency}_native`] = value;
                    });
                }
                return data;
            },
        );

        if (showVariation && processedSnapshots.length > 0) {
            // Variation mode: render every series as a percentage delta
            // from the first datum in the range. The original absolute
            // value is preserved on `<key>_original` so the tooltip can
            // surface both the percentage and the underlying amount.
            const baseline = processedSnapshots[0];
            const baselineTotal = baseline.total ?? 0;

            return processedSnapshots.map((snapshot) => {
                const snapshotTotal = snapshot.total ?? 0;
                const variationData: NetWorthChartDatum = {
                    date: snapshot.date,
                    fullDate: snapshot.fullDate,
                    snapshotId: snapshot.snapshotId,
                    total:
                        baselineTotal !== 0
                            ? ((snapshotTotal - baselineTotal) /
                                  Math.abs(baselineTotal)) *
                              100
                            : 0,
                    total_original: snapshotTotal,
                };

                if (viewMode === 'breakdown') {
                    currencies.forEach((currency) => {
                        const baseVal =
                            (baseline[currency] as number | undefined) ?? 0;
                        const currentVal =
                            (snapshot[currency] as number | undefined) ?? 0;
                        variationData[currency] =
                            baseVal !== 0
                                ? ((currentVal - baseVal) / Math.abs(baseVal)) *
                                  100
                                : 0;
                        variationData[`${currency}_original`] = currentVal;
                        variationData[`${currency}_native`] =
                            (snapshot[`${currency}_native`] as number | undefined) ?? currentVal;
                    });
                }

                return variationData;
            });
        }

        return processedSnapshots;
    }, [
        filteredSnapshots,
        viewMode,
        showVariation,
        primaryCurrency,
        currencies,
    ]);

    return {
        chartData,
        currencies,
    };
};
