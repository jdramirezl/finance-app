import type { InvestmentCacheInfo } from '../../hooks/useInvestmentPrices';

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;

/**
 * Formats {@link InvestmentCacheInfo} into the freshness hint shown under
 * each investment card's price line.
 *
 * - `null` when there is no cached price (initial load, never fetched).
 * - "Just now" when the price was updated within the last minute — the
 *   "Next in ~Xh" suffix would round to the full cache window which is
 *   visually noisy for a refresh that just landed.
 * - "Updated Xh ago · Refresh available" once the cache window has
 *   elapsed; clicking refresh will hit the upstream API.
 * - "Updated Xh ago · Next in ~Yh" otherwise.
 */
export const formatCacheLabel = (
  info: InvestmentCacheInfo,
  now: number = Date.now()
): string | null => {
  if (info.lastUpdated === null) return null;

  const ageMs = now - info.lastUpdated;

  const ageLabel = ageMs < ONE_MINUTE_MS
    ? 'Just now'
    : ageMs < ONE_HOUR_MS
      ? `${Math.round(ageMs / ONE_MINUTE_MS)}min ago`
      : `${Math.round(ageMs / ONE_HOUR_MS)}h ago`;

  if (info.nextRefreshAt === null) return ageLabel;

  const remainingMs = info.nextRefreshAt - now;
  if (remainingMs <= 0) return `${ageLabel} · Refresh available`;

  const nextTime = new Date(info.nextRefreshAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${ageLabel} · Next at ${nextTime}`;
};
