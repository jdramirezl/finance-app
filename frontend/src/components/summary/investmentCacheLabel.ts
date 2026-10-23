import type { InvestmentCacheInfo } from '../../hooks/useInvestmentPrices';

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;

const PROVIDER_NAMES: Record<string, string> = {
  finnhub: 'Finnhub',
  alphavantage: 'Alpha Vantage',
};

const STALE_REASONS: Record<string, string> = {
  RATE_LIMITED: 'provider limit reached',
  AUTH: 'provider API key rejected',
  NETWORK: 'provider unreachable',
  UPSTREAM: 'provider error',
};

/** Human name for a backend provider id ("finnhub" → "Finnhub"). */
export const providerLabel = (provider: string | null | undefined): string | null =>
  provider ? (PROVIDER_NAMES[provider] ?? provider) : null;

/** Plain-language reason a fresh price couldn't be fetched. */
export const staleReasonLabel = (reason: string | null | undefined): string =>
  (reason && STALE_REASONS[reason]) || 'provider unavailable';

/** Local "HH:MM" for a unix-ms timestamp. */
export const formatClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Freshness label shown under each investment card's price.
 *
 * - `null` when there is no cached price yet.
 * - Fresh: "12min ago · Finnhub" (provider omitted when unknown).
 * - Stale (provider failed, last saved price shown):
 *   "Price from 10:12 · couldn't refresh (provider limit reached)".
 */
export const formatCacheLabel = (
  info: InvestmentCacheInfo,
  now: number = Date.now()
): string | null => {
  if (info.lastUpdated === null) return null;

  if (info.stale) {
    return `Price from ${formatClock(info.lastUpdated)} · couldn't refresh (${staleReasonLabel(info.staleReason)})`;
  }

  const ageMs = now - info.lastUpdated;
  const ageLabel = ageMs < ONE_MINUTE_MS
    ? 'Just now'
    : ageMs < ONE_HOUR_MS
      ? `${Math.round(ageMs / ONE_MINUTE_MS)}min ago`
      : `${Math.round(ageMs / ONE_HOUR_MS)}h ago`;

  const provider = providerLabel(info.provider);
  return provider ? `${ageLabel} · ${provider}` : ageLabel;
};
