import { describe, it, expect } from 'vitest';
import { parseDate, toDateOnly, toMonthKey, formatDisplayDate } from './dateUtils';

describe('parseDate', () => {
    it('parses an ISO datetime string into a valid Date', () => {
        const d = parseDate('2025-03-15T12:30:00.000Z');
        expect(d.toISOString()).toBe('2025-03-15T12:30:00.000Z');
    });

    it('parses a date-only string as local midnight (not UTC midnight)', () => {
        // The off-by-one bug: `new Date("2025-03-15")` in UTC-6 gives
        // March 14 18:00 local. parseDate must give March 15 00:00 local.
        const d = parseDate('2025-03-15');
        expect(d.getFullYear()).toBe(2025);
        expect(d.getMonth()).toBe(2); // March (0-indexed)
        expect(d.getDate()).toBe(15);
        expect(d.getHours()).toBe(0);
        expect(d.getMinutes()).toBe(0);
    });

    it('returns Invalid Date for empty input', () => {
        const d = parseDate('');
        expect(Number.isNaN(d.getTime())).toBe(true);
    });

    it('returns Invalid Date for unparseable input', () => {
        const d = parseDate('not a date');
        expect(Number.isNaN(d.getTime())).toBe(true);
    });
});

describe('toDateOnly', () => {
    it('preserves the date portion of an ISO datetime without timezone shifting', () => {
        // Even though this UTC midnight would render as March 14 in UTC-6,
        // the writer's intended date was March 15 — preserve it.
        expect(toDateOnly('2025-03-15T00:00:00.000Z')).toBe('2025-03-15');
    });

    it('returns a date-only string unchanged', () => {
        expect(toDateOnly('2025-03-15')).toBe('2025-03-15');
    });

    it('handles datetime strings with non-zero time components', () => {
        expect(toDateOnly('2025-12-31T23:59:59.999Z')).toBe('2025-12-31');
    });

    it('returns empty string for empty input', () => {
        expect(toDateOnly('')).toBe('');
    });
});

describe('toMonthKey', () => {
    it('returns YYYY-MM for an ISO datetime', () => {
        expect(toMonthKey('2025-03-15T12:30:00.000Z')).toBe('2025-03');
    });

    it('returns YYYY-MM for a date-only string', () => {
        expect(toMonthKey('2025-03-15')).toBe('2025-03');
    });

    it('does not shift months due to timezone', () => {
        // The classic case: a UTC midnight on the 1st could render as the
        // last day of the previous month in negative offsets. Stay on March.
        expect(toMonthKey('2025-03-01T00:00:00.000Z')).toBe('2025-03');
    });

    it('returns empty string for empty input', () => {
        expect(toMonthKey('')).toBe('');
    });
});

describe('formatDisplayDate', () => {
    it('formats an ISO datetime using the default pattern', () => {
        expect(formatDisplayDate('2025-03-15T00:00:00.000Z')).toBe('Mar 15, 2025');
    });

    it('formats a date-only string using the default pattern', () => {
        expect(formatDisplayDate('2025-03-15')).toBe('Mar 15, 2025');
    });

    it('does not shift the displayed date due to timezone', () => {
        // This is the original off-by-one bug: in UTC-6 the "naive"
        // formatter renders "Mar 14, 2025". formatDisplayDate must keep
        // March 15 regardless of host timezone.
        expect(formatDisplayDate('2025-03-15T00:00:00.000Z')).toBe('Mar 15, 2025');
    });

    it('accepts a custom format pattern', () => {
        expect(formatDisplayDate('2025-03-15', 'yyyy/MM/dd')).toBe('2025/03/15');
        expect(formatDisplayDate('2025-03-15T00:00:00.000Z', 'MMM dd')).toBe('Mar 15');
    });

    it('returns empty string for empty input', () => {
        expect(formatDisplayDate('')).toBe('');
    });

    it('returns empty string for unparseable input', () => {
        expect(formatDisplayDate('not a date')).toBe('');
    });
});
