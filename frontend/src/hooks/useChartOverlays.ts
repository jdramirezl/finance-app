/**
 * useChartOverlays
 *
 * Fetches and normalizes time-series data for chart overlays (currency
 * exchange rates and stock prices) so they can be rendered alongside the
 * net-worth timeline as dashed reference lines.
 *
 * Each overlay is fetched as an independent TanStack Query so two
 * overlays sharing a symbol or pair dedupe to a single network call.
 *
 * Normalization modes:
 *  - `showVariation = true`  → percentage delta from the first point
 *    inside the visible window (matches the net-worth chart's variation
 *    transform). The first visible point becomes 0 %.
 *  - `showVariation = false` → min-max scaled to the [0, 1] range using
 *    the visible window's extrema. Lets us render overlays on a
 *    secondary y-axis without distorting the primary scale.
 *
 * Out-of-window data is still emitted (chart consumers may render the
 * full series with the visible window controlling the zoom), but the
 * normalization baseline / extrema are derived from the visible window
 * only — otherwise zooming would silently change every overlay's shape.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { currencyService } from '../services/currencyService';
import { investmentService } from '../services/investmentService';

const FX_OVERLAY_SEPARATOR = '→';
const HISTORY_DAYS = 1825; // ~5 years — covers the full snapshot timeline

/**
 * Color palette for known overlays. Anything not in the map falls back to
 * a neutral gray so unrecognized overlays still render legibly.
 */
const OVERLAY_COLORS: Record<string, string> = {
    'USD→COP': '#06b6d4', // teal
    'MXN→COP': '#f59e0b', // amber
    VOO: '#84cc16',       // lime
};
const DEFAULT_OVERLAY_COLOR = '#9ca3af'; // gray

export interface OverlayDataPoint {
    /** ISO date string (YYYY-MM-DD). */
    date: string;
    /** Normalized value — % delta in variation mode, [0, 1] in absolute mode. */
    value: number;
    /** Underlying value (rate or price) preserved for tooltip display. */
    rawValue: number;
}

export interface OverlaySeries {
    /** Stable identifier — currency pair like 'USD→COP' or stock symbol like 'VOO'. */
    id: string;
    /** Human-readable label, currently the same as `id` but kept separate for future i18n. */
    label: string;
    /** Hex color for the overlay line. */
    color: string;
    /** Normalized data points, ordered ascending by date. */
    data: OverlayDataPoint[];
}

export interface UseChartOverlaysParams {
    /** IDs of overlays to fetch and render. Currency pairs use `→` (e.g. `USD→COP`). */
    activeOverlays: string[];
    /** User's primary currency — currently unused but accepted so the chart
     *  consumer can pass a single source of truth without conditional plumbing. */
    primaryCurrency: string;
    /** When true, normalize each series as % delta from the first visible point. */
    showVariation: boolean;
    /** Inclusive lower bound of the visible chart window (ISO date) or null for no bound. */
    visibleStartDate: string | null;
    /** Inclusive upper bound of the visible chart window (ISO date) or null for no bound. */
    visibleEndDate: string | null;
}

export interface UseChartOverlaysResult {
    overlays: OverlaySeries[];
    isLoading: boolean;
}

interface RawOverlayEntry {
    date: string;
    rawValue: number;
}

/**
 * Returns the line / chip color for a given overlay id. Currency pairs
 * and stock symbols share the same lookup table so the chip swatch in
 * `OverlayToggleChips` can match the dashed line drawn on the chart for
 * the same overlay. Unknown ids fall back to a neutral gray so the UI
 * still renders something legible if a previously-saved overlay no
 * longer maps to a known palette entry.
 */
export const getOverlayColor = (overlayId: string): string =>
    OVERLAY_COLORS[overlayId] ?? DEFAULT_OVERLAY_COLOR;

/** Currency pairs are encoded as `BASE→TARGET` — anything else is a stock symbol. */
const isCurrencyPair = (overlayId: string): boolean =>
    overlayId.includes(FX_OVERLAY_SEPARATOR);

const overlayQueryKey = (overlayId: string) =>
    ['chartOverlay', overlayId] as const;

/**
 * Returns the index of the first entry whose date is >= the visible
 * window's start, or 0 if no start bound is set / nothing matches before
 * the bound. The result is the baseline anchor for variation mode.
 */
const findFirstVisibleIndex = (
    entries: RawOverlayEntry[],
    visibleStartDate: string | null,
): number => {
    if (!visibleStartDate || entries.length === 0) return 0;
    const idx = entries.findIndex((e) => e.date >= visibleStartDate);
    return idx === -1 ? 0 : idx;
};

/**
 * Returns the contiguous slice of entries falling inside the visible
 * window. Used to derive min/max for absolute (0–1) normalization.
 */
const sliceVisibleEntries = (
    entries: RawOverlayEntry[],
    visibleStartDate: string | null,
    visibleEndDate: string | null,
): RawOverlayEntry[] => {
    if (!visibleStartDate && !visibleEndDate) return entries;
    return entries.filter((e) => {
        if (visibleStartDate && e.date < visibleStartDate) return false;
        if (visibleEndDate && e.date > visibleEndDate) return false;
        return true;
    });
};

const normalizeVariation = (
    entries: RawOverlayEntry[],
    visibleStartDate: string | null,
): OverlayDataPoint[] => {
    if (entries.length === 0) return [];
    const baselineIdx = findFirstVisibleIndex(entries, visibleStartDate);
    const baseline = entries[baselineIdx]?.rawValue ?? 0;
    return entries.map((entry) => ({
        date: entry.date,
        rawValue: entry.rawValue,
        value:
            baseline !== 0
                ? ((entry.rawValue - baseline) / Math.abs(baseline)) * 100
                : 0,
    }));
};

const normalizeAbsolute = (
    entries: RawOverlayEntry[],
    visibleStartDate: string | null,
    visibleEndDate: string | null,
): OverlayDataPoint[] => {
    if (entries.length === 0) return [];
    const visible = sliceVisibleEntries(
        entries,
        visibleStartDate,
        visibleEndDate,
    );
    const sample = visible.length > 0 ? visible : entries;
    let min = sample[0].rawValue;
    let max = sample[0].rawValue;
    for (const entry of sample) {
        if (entry.rawValue < min) min = entry.rawValue;
        if (entry.rawValue > max) max = entry.rawValue;
    }
    const range = max - min;
    return entries.map((entry) => ({
        date: entry.date,
        rawValue: entry.rawValue,
        // Flat series collapse to 0.5 so they render on the chart's
        // mid-line rather than disappearing or NaN-ing the y-axis.
        value: range === 0 ? 0.5 : (entry.rawValue - min) / range,
    }));
};

/**
 * Hook entry point. Returns one `OverlaySeries` per active overlay, in
 * the same order as `activeOverlays`. Pending and errored overlays are
 * omitted — `isLoading` reflects whether any underlying query is still
 * fetching so consumers can show a skeleton state.
 */
export const useChartOverlays = ({
    activeOverlays,
    showVariation,
    visibleStartDate,
    visibleEndDate,
}: UseChartOverlaysParams): UseChartOverlaysResult => {
    const queries = useQueries({
        queries: activeOverlays.map((overlayId) => ({
            queryKey: overlayQueryKey(overlayId),
            queryFn: async (): Promise<RawOverlayEntry[]> => {
                if (isCurrencyPair(overlayId)) {
                    const [base, target] = overlayId.split(FX_OVERLAY_SEPARATOR);
                    const response = await currencyService.getExchangeRateHistory(
                        base,
                        target,
                        HISTORY_DAYS,
                    );
                    return response.data.map((entry) => ({
                        date: entry.date,
                        rawValue: entry.rate,
                    }));
                }

                const response = await investmentService.getStockPriceHistory(
                    overlayId,
                    HISTORY_DAYS,
                );
                return response.data.map((entry) => ({
                    date: entry.date,
                    rawValue: entry.price,
                }));
            },
            // Historical overlays don't change frequently — an hour of
            // staleness keeps tab switches snappy without staling out
            // intra-session refreshes.
            staleTime: 1000 * 60 * 60,
        })),
    });

    const overlays = useMemo<OverlaySeries[]>(() => {
        const result: OverlaySeries[] = [];
        activeOverlays.forEach((overlayId, idx) => {
            const query = queries[idx];
            if (!query || !query.data || query.data.length === 0) return;

            const sortedEntries = [...query.data].sort((a, b) =>
                a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
            );

            const data = showVariation
                ? normalizeVariation(sortedEntries, visibleStartDate)
                : normalizeAbsolute(
                      sortedEntries,
                      visibleStartDate,
                      visibleEndDate,
                  );

            result.push({
                id: overlayId,
                label: overlayId,
                color: getOverlayColor(overlayId),
                data,
            });
        });
        return result;
    }, [
        activeOverlays,
        queries,
        showVariation,
        visibleStartDate,
        visibleEndDate,
    ]);

    const isLoading = queries.some((q) => q.isLoading);

    return { overlays, isLoading };
};
