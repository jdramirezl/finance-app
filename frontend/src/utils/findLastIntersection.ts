/**
 * Result of a horizontal-line / line-chart intersection lookup. The
 * intersection coordinate is what ECharts needs to render a marker point
 * via `markPoint` (a `[date, value]` tuple): the date is interpolated so
 * the dot sits exactly on the chart line at the target y-value.
 */
export interface LineCrossing {
  /** ISO date string of the crossing, interpolated between two snapshots. */
  date: string;
  /** Echoed target y-value — convenient for callers that need a tuple. */
  value: number;
}

/**
 * One data point on the net-worth chart, in the shape this utility cares
 * about. We don't import `NetWorthEChartDatum` here to keep the util
 * dependency-free and trivially testable; the caller passes the relevant
 * fields.
 */
export interface SeriesPoint {
  /** ISO date string (e.g. `"2025-06-15"`). */
  date: string;
  /** Y-value at this point. */
  value: number;
}

/**
 * Find the most recent point in `series` where the polyline crosses the
 * horizontal level `targetValue`. Returns `null` when there is no
 * crossing in the visible series, or when fewer than two points are
 * provided.
 *
 * Semantics:
 * - The series is treated as a polyline (consecutive points joined by
 *   straight segments). A segment `(a, b)` is considered to "cross"
 *   `targetValue` when `targetValue` lies between `a.value` and `b.value`
 *   inclusive on one side and strict on the other — i.e. the line passes
 *   THROUGH the level rather than just touching it from the same side.
 * - When a point's value exactly equals `targetValue`, the crossing is
 *   placed at that point's date.
 * - When `a.value === b.value === targetValue` (flat segment along the
 *   level), the more recent endpoint is returned. This keeps "last time
 *   we were here" intuitive: we report the latest moment we were AT this
 *   level rather than the start of the plateau.
 * - The function scans backwards from the most recent point, so the
 *   first crossing found IS the most recent one.
 *
 * Interpolation uses linear timestamp interpolation. Dates parse via
 * `new Date(iso)`; the returned date is rendered with `Date#toISOString`
 * and truncated to the `YYYY-MM-DD` prefix to match how the rest of the
 * widget formats dates.
 */
export const findLastIntersection = (
  series: readonly SeriesPoint[],
  targetValue: number,
): LineCrossing | null => {
  if (series.length < 2) return null;
  if (!Number.isFinite(targetValue)) return null;

  // Walk segments from newest to oldest. Stop at the first crossing.
  for (let i = series.length - 1; i > 0; i--) {
    const b = series[i];
    const a = series[i - 1];

    if (!Number.isFinite(a.value) || !Number.isFinite(b.value)) continue;

    // Exact hit on the newer endpoint is the simplest case — also covers
    // flat segments where `a.value === b.value === targetValue` (we
    // return the newer endpoint, never the older one).
    if (b.value === targetValue) {
      return { date: b.date, value: targetValue };
    }

    // Standard interval check: targetValue is strictly between the two
    // endpoint values (one above, one below — or one equal to target).
    const min = Math.min(a.value, b.value);
    const max = Math.max(a.value, b.value);
    if (targetValue >= min && targetValue <= max && a.value !== b.value) {
      // Linear interpolation on the segment. Compute the fraction of the
      // way from `a` to `b` and apply it to the timestamps.
      const t = (targetValue - a.value) / (b.value - a.value);
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (!Number.isFinite(ta) || !Number.isFinite(tb)) continue;
      const interpolatedMs = ta + t * (tb - ta);
      const iso = new Date(interpolatedMs).toISOString().slice(0, 10);
      return { date: iso, value: targetValue };
    }
  }

  return null;
};
