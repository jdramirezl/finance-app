import { useCallback, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { currencyService } from '../services/currencyService';
import { investmentService } from '../services/investmentService';
import type { Account, Pocket } from '../types';
import type { InvestmentData } from '../components/summary';
import type { useToast } from './useToast';

const CLICK_TIMEOUT = 2000; // 2 seconds window for triple-click
const FORCE_REFRESH_COOLDOWN = 60000; // 1 minute cooldown
const FORCE_CLICK_THRESHOLD = 3;

// Prices don't move often enough to justify refetching on every mount or
// dependency change, but the backend now decides how aggressively to hit
// the upstream price API based on the active-symbol count. We poll the
// backend every 5 minutes so cache invalidations propagate quickly while
// still letting the backend's dynamic TTL throttle real upstream calls.
const PRICE_STALE_TIME_MS = 1000 * 60 * 5;

const investmentPriceKey = (symbol: string) =>
  ['investmentPrice', symbol] as const;

interface ClickEntry {
  count: number;
  timestamp: number;
}

const findInvestmentPocketBalances = (accountId: string, pockets: Pocket[]) => {
  const investedPocket = pockets.find(
    (p) => p.accountId === accountId && p.name === 'Invested Money'
  );
  const sharesPocket = pockets.find(
    (p) => p.accountId === accountId && p.name === 'Shares'
  );
  return {
    montoInvertido: investedPocket?.balance || 0,
    shares: sharesPocket?.balance || 0,
  };
};

export interface UseInvestmentPricesParams {
  accounts: Account[];
  pockets: Pocket[];
  toast: ReturnType<typeof useToast.getState>;
}

export interface UseInvestmentPricesResult {
  investmentData: Map<string, InvestmentData>;
  refreshingPrices: Set<string>;
  handleRefreshPrice: (account: Account) => Promise<void>;
}

/**
 * Loads stock/ETF prices for all investment accounts via TanStack Query so
 * each symbol is fetched once and cached for `PRICE_STALE_TIME_MS`. Pocket-
 * level derived values (montoInvertido, shares, gains) are recomputed
 * locally on each pocket change without re-hitting the network — this is
 * the main performance win over the previous useEffect-based loader, which
 * refetched every price whenever `accounts` or `pockets` references churned.
 *
 * Triple-click invokes a "force refresh" that invalidates the cached query
 * so the next render fetches fresh data, with a per-symbol cooldown to
 * avoid hammering the upstream price service.
 */
export const useInvestmentPrices = ({
  accounts,
  pockets,
  toast,
}: UseInvestmentPricesParams): UseInvestmentPricesResult => {
  const queryClient = useQueryClient();
  const [refreshingPrices, setRefreshingPrices] = useState<Set<string>>(
    new Set()
  );
  const [clickCounts, setClickCounts] = useState<Map<string, ClickEntry>>(
    new Map()
  );
  const [lastForceRefresh, setLastForceRefresh] = useState<Map<string, number>>(
    new Map()
  );

  // Investment accounts that actually have a tradable symbol. Memoized so
  // useQueries' query list stays stable across unrelated account churn.
  const investmentAccounts = useMemo(
    () =>
      accounts.filter(
        (acc) => acc.type === 'investment' && !!acc.stockSymbol
      ),
    [accounts]
  );

  // One query per symbol — TanStack Query dedupes identical keys, so two
  // accounts holding the same symbol share a single network call and a
  // single cache entry.
  const priceQueries = useQueries({
    queries: investmentAccounts.map((account) => ({
      queryKey: investmentPriceKey(account.stockSymbol as string),
      queryFn: () =>
        investmentService.getCurrentPrice(account.stockSymbol as string),
      staleTime: PRICE_STALE_TIME_MS,
    })),
  });

  // Build a stable signature of query state so the memo below only
  // recomputes when prices, errors, or pending status actually change.
  // useQueries returns equal-deep results across renders, but we still
  // want to be defensive about Map identity for downstream consumers
  // (e.g. useConsolidatedTotal depends on this reference).
  const queriesSignature = useMemo(
    () =>
      priceQueries
        .map((q, i) => {
          const symbol = investmentAccounts[i]?.stockSymbol ?? '';
          const status = q.isError
            ? 'error'
            : q.data !== undefined
              ? 'data'
              : 'pending';
          return `${symbol}:${status}:${q.data ?? ''}`;
        })
        .join('|'),
    [priceQueries, investmentAccounts]
  );

  // Combine each query result with current pocket balances to produce the
  // InvestmentData consumers expect. A query failure surfaces a zero-price
  // fallback so the rest of the summary still renders.
  const investmentData = useMemo(() => {
    const next = new Map<string, InvestmentData>();
    investmentAccounts.forEach((account, idx) => {
      const query = priceQueries[idx];
      if (!query || !account.stockSymbol) return;

      const { montoInvertido, shares } = findInvestmentPocketBalances(
        account.id,
        pockets
      );

      if (query.data !== undefined) {
        const values = investmentService.calculateInvestmentValues(
          { ...account, montoInvertido, shares },
          query.data
        );
        next.set(account.id, {
          precioActual: query.data,
          ...values,
          lastUpdated: investmentService.getPriceTimestamp(account.stockSymbol),
          montoInvertido,
          shares,
        });
        return;
      }

      if (query.isError) {
        // Failure fallback — surface zero price with negative gains so UI
        // degrades gracefully rather than crashing the whole summary.
        next.set(account.id, {
          precioActual: 0,
          totalValue: 0,
          gainsUSD: -montoInvertido,
          gainsPct: -100,
          lastUpdated: null,
          montoInvertido,
          shares,
        });
      }
      // Pending queries leave the entry off the map until the first
      // successful (or failed) fetch — matches the previous behavior of
      // not pre-populating zero values on initial render.
    });
    return next;
    // queriesSignature captures all query state changes we care about; the
    // priceQueries array reference is intentionally not in deps to avoid
    // rebuilding the Map when only unrelated query metadata churns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investmentAccounts, pockets, queriesSignature]);

  // Memoized so the handler keeps a stable identity when its inputs don't
  // change. Memoized children receiving onRefresh (e.g. InvestmentCard) can
  // then skip re-renders on unrelated parent updates.
  const handleRefreshPrice = useCallback(
    async (account: Account) => {
      if (!account.stockSymbol) return;

      const now = Date.now();
      const currentClick = clickCounts.get(account.id);
      const lastClick = currentClick?.timestamp || 0;
      const clickCount =
        now - lastClick < CLICK_TIMEOUT ? (currentClick?.count || 0) + 1 : 1;

      setClickCounts((prev) => {
        const next = new Map(prev);
        next.set(account.id, { count: clickCount, timestamp: now });
        return next;
      });

      if (clickCount === 1) {
        toast.info('2 more clicks to force refresh');
      } else if (clickCount === 2) {
        toast.info('1 more click to force refresh');
      } else if (clickCount >= FORCE_CLICK_THRESHOLD) {
        const lastForce = lastForceRefresh.get(account.id) || 0;
        const sinceLastForce = now - lastForce;

        if (sinceLastForce < FORCE_REFRESH_COOLDOWN) {
          const secondsLeft = Math.ceil(
            (FORCE_REFRESH_COOLDOWN - sinceLastForce) / 1000
          );
          toast.error(
            `Please wait ${secondsLeft} seconds before force refreshing again`
          );
          setClickCounts((prev) => {
            const next = new Map(prev);
            next.delete(account.id);
            return next;
          });
          return;
        }

        toast.info('Forcing refresh...');
        setLastForceRefresh((prev) => {
          const next = new Map(prev);
          next.set(account.id, now);
          return next;
        });
        setClickCounts((prev) => {
          const next = new Map(prev);
          next.delete(account.id);
          return next;
        });
      }

      const isForceRefresh = clickCount >= FORCE_CLICK_THRESHOLD;
      setRefreshingPrices((prev) => new Set(prev).add(account.id));

      try {
        // invalidateQueries triggers a refetch via the registered queryFn
        // (investmentService.getCurrentPrice) and resolves once the active
        // query has finished. The fresh value then sits in the query cache
        // for the toast below and propagates to consumers via priceQueries.
        await queryClient.invalidateQueries({
          queryKey: investmentPriceKey(account.stockSymbol),
        });

        const price =
          queryClient.getQueryData<number>(
            investmentPriceKey(account.stockSymbol)
          ) ?? 0;

        toast.success(
          `Price ${isForceRefresh ? 'force ' : ''}refreshed: ${
            account.stockSymbol
          } = ${currencyService.formatCurrency(price, account.currency)}`
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to refresh price'
        );
      } finally {
        setRefreshingPrices((prev) => {
          const next = new Set(prev);
          next.delete(account.id);
          return next;
        });
      }
    },
    [clickCounts, lastForceRefresh, queryClient, toast]
  );

  return {
    investmentData,
    refreshingPrices,
    handleRefreshPrice,
  };
};
