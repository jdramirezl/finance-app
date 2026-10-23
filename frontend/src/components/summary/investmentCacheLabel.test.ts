import { describe, it, expect } from 'vitest';
import { formatCacheLabel, providerLabel, staleReasonLabel } from './investmentCacheLabel';

const HOUR_MS = 3_600_000;
const base = { nextRefreshAt: null, stale: false, staleReason: null, provider: null };
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

describe('formatCacheLabel', () => {
  it('returns null when there is no cached price yet', () => {
    expect(formatCacheLabel({ ...base, lastUpdated: null })).toBeNull();
  });

  it('shows "Just now" and the provider for a fresh price', () => {
    const now = 1_000_000_000;
    expect(formatCacheLabel({ ...base, lastUpdated: now - 30_000, provider: 'finnhub' }, now)).toBe('Just now · Finnhub');
  });

  it('formats minutes and hours ago', () => {
    const now = 1_000_000_000;
    expect(formatCacheLabel({ ...base, lastUpdated: now - 12 * 60_000, provider: 'alphavantage' }, now)).toBe('12min ago · Alpha Vantage');
    expect(formatCacheLabel({ ...base, lastUpdated: now - 2 * HOUR_MS }, now)).toBe('2h ago');
  });

  it('says plainly when the price is stale and why', () => {
    const now = 1_000_000_000;
    const at = now - 5 * HOUR_MS;
    expect(formatCacheLabel({ ...base, lastUpdated: at, stale: true, staleReason: 'RATE_LIMITED' }, now))
      .toBe(`Price from ${hhmm(at)} · couldn't refresh (provider limit reached)`);
  });
});

describe('label helpers', () => {
  it('maps provider ids to names', () => {
    expect(providerLabel('finnhub')).toBe('Finnhub');
    expect(providerLabel('alphavantage')).toBe('Alpha Vantage');
    expect(providerLabel('other')).toBe('other');
    expect(providerLabel(null)).toBeNull();
  });

  it('maps stale reasons to plain text', () => {
    expect(staleReasonLabel('RATE_LIMITED')).toBe('provider limit reached');
    expect(staleReasonLabel('AUTH')).toBe('provider API key rejected');
    expect(staleReasonLabel('NETWORK')).toBe('provider unreachable');
    expect(staleReasonLabel(null)).toBe('provider unavailable');
  });
});
