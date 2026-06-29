import { describe, expect, it } from 'vitest';
import { findLastIntersection } from './findLastIntersection';

const point = (date: string, value: number) => ({ date, value });

describe('findLastIntersection', () => {
  it('returns null when the series has fewer than two points', () => {
    expect(findLastIntersection([], 100)).toBeNull();
    expect(findLastIntersection([point('2025-01-01', 100)], 100)).toBeNull();
  });

  it('returns null when no segment crosses the target value', () => {
    const result = findLastIntersection(
      [point('2025-01-01', 100), point('2025-02-01', 110), point('2025-03-01', 120)],
      500,
    );
    expect(result).toBeNull();
  });

  it('finds an interpolated crossing inside a single segment', () => {
    // Line goes from 100 at Jan 1 to 200 at Feb 1. Crossing 150 is the
    // midpoint of the segment (~Jan 16).
    const result = findLastIntersection(
      [point('2025-01-01', 100), point('2025-02-01', 200)],
      150,
    );
    expect(result).not.toBeNull();
    expect(result!.value).toBe(150);
    // Midpoint of Jan 1 → Feb 1 is approximately Jan 16/17. We assert
    // the month/year rather than the exact day to keep the test
    // resilient to timezone parsing wobble.
    expect(result!.date.startsWith('2025-01-1')).toBe(true);
  });

  it('returns the more recent crossing when multiple exist', () => {
    // 100 → 200 → 100 → 200: target 150 crosses three segments. The most
    // recent crossing is in the last segment.
    const result = findLastIntersection(
      [
        point('2025-01-01', 100),
        point('2025-02-01', 200),
        point('2025-03-01', 100),
        point('2025-04-01', 200),
      ],
      150,
    );
    expect(result).not.toBeNull();
    // The most recent crossing must fall in the Mar–Apr 2025 window.
    const ms = new Date(result!.date).getTime();
    expect(ms).toBeGreaterThanOrEqual(new Date('2025-03-01').getTime());
    expect(ms).toBeLessThanOrEqual(new Date('2025-04-01').getTime());
  });

  it('snaps to an exact endpoint hit on the newer side', () => {
    const result = findLastIntersection(
      [point('2025-01-01', 100), point('2025-02-01', 150)],
      150,
    );
    expect(result).toEqual({ date: '2025-02-01', value: 150 });
  });

  it('returns the most recent endpoint of a flat segment at the target level', () => {
    // Two consecutive points at exactly 100. The "last time we were
    // here" is intuitively the more recent of the two.
    const result = findLastIntersection(
      [
        point('2025-01-01', 50),
        point('2025-02-01', 100),
        point('2025-03-01', 100),
        point('2025-04-01', 50),
      ],
      100,
    );
    expect(result).not.toBeNull();
    // Most recent segment containing 100 is Mar–Apr (100 → 50). On the
    // newer side, b.value = 50 (not equal to target), so the function
    // interpolates inside that segment — its date should be on Mar/Apr.
    const ms = new Date(result!.date).getTime();
    expect(ms).toBeGreaterThanOrEqual(new Date('2025-03-01').getTime());
    expect(ms).toBeLessThanOrEqual(new Date('2025-04-01').getTime());
  });

  it('ignores NaN values defensively', () => {
    const result = findLastIntersection(
      [
        point('2025-01-01', 100),
        point('2025-02-01', NaN),
        point('2025-03-01', 200),
      ],
      150,
    );
    // First segment (100 → NaN) is skipped, second (NaN → 200) is
    // skipped, so the function falls through to null.
    expect(result).toBeNull();
  });

  it('returns null for a NaN target value', () => {
    expect(
      findLastIntersection(
        [point('2025-01-01', 100), point('2025-02-01', 200)],
        Number.NaN,
      ),
    ).toBeNull();
  });
});
