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
  if (ageMs < ONE_MINUTE_MS) return 'Just now';

  const ageH = Math.max(1, Math.round(ageMs / ONE_HOUR_MS));
  if (info.nextRefreshAt === null) return `Updated ${ageH}h ago`;

  const remainingMs = info.nextRefreshAt - now;
  if (remainingMs <= 0) return `Updated ${ageH}h ago · Refresh available`;

  const nextH = Math.max(1, Math.ceil(remainingMs / ONE_HOUR_MS));
  return `Updated ${ageH}h ago · Next in ~${nextH}h`;
};
