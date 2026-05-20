import { format, parseISO } from 'date-fns';

/**
 * Centralized date helpers for the frontend.
 *
 * Why this exists: the app stores dates as a mix of ISO datetimes
 * ("2025-03-15T00:00:00.000Z") and date-only strings ("2025-03-15").
 * `new Date("2025-03-15")` interprets the date-only form as UTC midnight,
 * which silently shifts to the previous day in negative UTC offsets
 * (e.g. America/Mexico_City). That is the source of the off-by-one-day
 * bugs throughout the UI.
 *
 * These helpers parse and format consistently so the same calendar date
 * appears regardless of the user's timezone.
 */

/**
 * Parse any date string safely. Handles ISO datetimes and date-only
 * strings. Date-only strings are interpreted as the start of that day in
 * the user's local timezone (matching `parseISO` semantics), which is
 * what we want for display and comparison.
 *
 * Returns Invalid Date for falsy or unparseable input rather than
 * throwing, so callers can guard with `Number.isNaN(d.getTime())`.
 */
export function parseDate(dateStr: string): Date {
    if (!dateStr) {
        return new Date(NaN);
    }
    return parseISO(dateStr);
}

/**
 * Get the date-only portion (YYYY-MM-DD) of any date string without
 * applying a timezone conversion.
 *
 * For ISO inputs (date-only or datetime) the leading `YYYY-MM-DD` is
 * returned verbatim, preserving the date the value was written with.
 * For non-ISO inputs we parse and format in the local timezone as a
 * best-effort fallback.
 *
 * This is the standardized replacement for the `.split('T')[0]` pattern.
 */
export function toDateOnly(dateStr: string): string {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
        return match[1];
    }
    const date = parseDate(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'yyyy-MM-dd');
}

/**
 * Get a month key (YYYY-MM) for grouping by calendar month.
 *
 * Uses `toDateOnly` first so the result is independent of the user's
 * timezone — a movement on `2025-03-15T00:00:00.000Z` belongs to March
 * 2025 in every locale.
 */
export function toMonthKey(dateStr: string): string {
    const dateOnly = toDateOnly(dateStr);
    return dateOnly ? dateOnly.substring(0, 7) : '';
}

/**
 * Format a date string for display.
 *
 * Always renders the calendar date as written, never shifted into the
 * user's timezone. Returns an empty string for falsy or invalid input,
 * matching the existing UI behavior of "render nothing if missing".
 *
 * @param dateStr - ISO datetime or date-only string
 * @param formatStr - date-fns format pattern (default: "MMM d, yyyy")
 */
export function formatDisplayDate(
    dateStr: string,
    formatStr: string = 'MMM d, yyyy'
): string {
    if (!dateStr) return '';
    const date = parseDate(toDateOnly(dateStr));
    if (Number.isNaN(date.getTime())) return '';
    return format(date, formatStr);
}
