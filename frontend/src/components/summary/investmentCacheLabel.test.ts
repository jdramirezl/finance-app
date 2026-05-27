import { describe, it, expect } from 'vitest';
import { formatCacheLabel } from './investmentCacheLabel';

const HOUR_MS = 3_600_000;

describe('formatCacheLabel', () => {
  it('returns null when there is no cached price yet', () => {
    expect(
      formatCacheLabel({
        lastUpdated: null,
        cacheHours: 1,
        nextRefreshAt: null,
      }),
    ).toBeNull();
  });

  it('shows "Just now" for sub-minute freshness', () => {
    const now = 1_000_000_000;
    const nextAt = now - 30_000 + HOUR_MS;
    const expectedTime = new Date(nextAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    expect(
      formatCacheLabel(
        {
          lastUpdated: now - 30_000,
          cacheHours: 1,
          nextRefreshAt: nextAt,
        },
        now,
      ),
    ).toBe(`Just now · Next at ${expectedTime}`);
  });

  it('formats hours-ago and remaining hours when within the cache window', () => {
    const now = 1_000_000_000;
    // Cached 2h ago, 6h cache window — 4h left until next refresh.
    const nextAt = now - 2 * HOUR_MS + 6 * HOUR_MS;
    const expectedTime = new Date(nextAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    expect(
      formatCacheLabel(
        {
          lastUpdated: now - 2 * HOUR_MS,
          cacheHours: 6,
          nextRefreshAt: nextAt,
        },
        now,
      ),
    ).toBe(`2h ago · Next at ${expectedTime}`);
  });

  it('signals "Refresh available" when the cache window has elapsed', () => {
    const now = 1_000_000_000;
    // Cached 5h ago with a 1h window — refresh is well past due.
    expect(
      formatCacheLabel(
        {
          lastUpdated: now - 5 * HOUR_MS,
          cacheHours: 1,
          nextRefreshAt: now - 5 * HOUR_MS + HOUR_MS,
        },
        now,
      ),
    ).toBe('5h ago · Refresh available');
  });

  it('falls back to the age-only label when nextRefreshAt is missing', () => {
    const now = 1_000_000_000;
    expect(
      formatCacheLabel(
        {
          lastUpdated: now - 3 * HOUR_MS,
          cacheHours: 4,
          nextRefreshAt: null,
        },
        now,
      ),
    ).toBe('3h ago');
  });
});
