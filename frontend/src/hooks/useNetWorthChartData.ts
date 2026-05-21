/**
 * useNetWorthChartData
 *
 * Encapsulates the data-side concerns of the net-worth timeline chart:
 *  - filtering snapshots by the selected date range,
 *  - discovering the set of currencies present in the snapshot breakdowns,
 *  - fetching cross-currency exchange rates so foreign-currency totals can
 *    be projected into the user's primary currency,
 *  - computing the chart datums for both `total` and `breakdown` modes
 *    (with the optional %-variation transform), and
 *  - producing a tooltip formatter that mirrors the YAxis tick format so
 *    the chart and tooltip values stay visually consistent.
 *
 * Consumers receive a stable result shape regardless of mode — the chart
 * component reads `currencies` to know which series to render in
 * `breakdown` mode and ignores it in `total` mode.
 */

import { useEffect, useMemo, useState } from 'react';
import type { TooltipProps } from 'recharts';
import { format, parseISO, subDays, subMonths, subYears } from 'date-fns';

import { currencyService } from '../services/currencyService';
import {
    formatCurrencyAmount,
    type FormatCurrencyAmountOptions,
} from '../components/CurrencyAmount';
import type { NetWorthSnapshot } from '../services/netWorthSnapshotService';
import type { Currency } from '../types';

export type NetWorthViewMode = 'total' | 'breakdown';
export type NetWorthDateRange = '30d' | '6m' | '1y' | 'all';

/**
 * Display name used for the aggregate "total" line. Exported because the
 * tooltip formatter needs to recognize it to look up the matching
 * `total_original` value when rendering in variation mode.
 */
export const NET_WORTH_TOTAL_LINE_NAME = 'Net Worth';

/**
 * Chart axis/tooltip use rounded integer currency values to keep the chart
 * readable. The exact formatter shape is shared between the YAxis
 * tickFormatter and the tooltip formatter so they stay visually
 * consistent.
 */
export const CHART_CURRENCY_FORMAT_OPTIONS: FormatCurrencyAmountOptions = {
    locale: 'en-US',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
};

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

export type NetWorthTooltipFormatter = NonNullable<
    TooltipProps<number, string>['formatter']
>;

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
    tooltipFormatter: NetWorthTooltipFormatter;
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
    const [rates, setRates] = useState<Record<string, number>>({});

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

    // Fetch the exchange rates needed to project every breakdown amount
    // into `primaryCurrency`. Falls back to the synchronous cached rate
    // when the async lookup fails so the chart can always render
    // something rather than getting stuck on `[]`.
    useEffect(() => {
        const fetchRates = async () => {
            const newRates: Record<string, number> = {};

            const promises = currencies.map(async (currency) => {
                if (currency === primaryCurrency) {
                    newRates[currency] = 1;
                    return;
                }
                try {
                    const rate = await currencyService.getExchangeRateAsync(
                        currency as Currency,
                        primaryCurrency as Currency,
                    );
                    newRates[currency] = rate;
                } catch {
                    newRates[currency] = currencyService.getExchangeRate(
                        currency as Currency,
                        primaryCurrency as Currency,
                    );
                }
            });

            await Promise.all(promises);
            setRates(newRates);
        };

        if (currencies.length > 0) {
            fetchRates();
        }
    }, [currencies, primaryCurrency]);

    const chartData = useMemo<NetWorthChartDatum[]>(() => {
        if (filteredSnapshots.length === 0) return [];

        // Wait for cross-currency rates to land before rendering anything
        // when the user holds a foreign currency — otherwise breakdown
        // amounts would be projected with stale `1` rates and produce a
        // visibly wrong chart on the first paint.
        const hasForeignCurrency = currencies.some((c) => c !== primaryCurrency);
        if (hasForeignCurrency && Object.keys(rates).length === 0) return [];

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
                        const rate = rates[currency] || 1;
                        data[currency] =
                            currency === primaryCurrency ? value : value * rate;
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
        rates,
    ]);

    const tooltipFormatter = useMemo<NetWorthTooltipFormatter>(() => {
        return (value, name, entry) => {
            const displayName = name != null ? String(name) : 'Value';
            if (value === undefined || value === null) {
                return ['N/A', displayName];
            }
            const numValue =
                typeof value === 'number' ? value : parseFloat(String(value));
            if (isNaN(numValue)) return ['N/A', displayName];

            if (showVariation) {
                // In variation mode each series stores its absolute value
                // on a parallel `<key>_original` field. Use that to render
                // `XX% (formatted-original)`.
                const originalKey =
                    displayName === NET_WORTH_TOTAL_LINE_NAME
                        ? 'total_original'
                        : `${displayName}_original`;
                const payload = (entry as { payload?: NetWorthChartDatum })
                    ?.payload;
                const originalValue = payload
                    ? (payload[originalKey] as number | undefined)
                    : undefined;
                const originalFormatted =
                    originalValue !== undefined
                        ? formatCurrencyAmount(
                              originalValue,
                              primaryCurrency,
                              CHART_CURRENCY_FORMAT_OPTIONS,
                          )
                        : 'N/A';
                return [
                    `${numValue.toFixed(2)}% (${originalFormatted})`,
                    displayName,
                ];
            }

            return [
                formatCurrencyAmount(
                    numValue,
                    primaryCurrency,
                    CHART_CURRENCY_FORMAT_OPTIONS,
                ),
                displayName,
            ];
        };
    }, [showVariation, primaryCurrency]);

    return {
        chartData,
        currencies,
        tooltipFormatter,
    };
};
