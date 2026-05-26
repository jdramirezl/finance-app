import { useCallback, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { currencyService } from '../services/currencyService';
import { investmentService } from '../services/investmentService';
import type { Account, Pocket } from '../types';
import type { InvestmentData } from '../components/summary';
import type { useToast } from './useToast';

// Single-click cooldown so impatient retaps don't hammer the upstream
// price service. Per-symbol — not per-account — so two cards holding the
// same ticker share the cooldown (matches the cross-card spinner behavior
// below).
const REFRESH_COOLDOWN_MS = 60_000;

// Prices don't move often enough to justify refetching on every mount or
// dependency change, but the backend now decides how aggressively to hit
// the upstream price API based on the active-symbol count. We poll the
// backend every 5 minutes so cache invalidations propagate quickly while
// still letting the backend's dynamic TTL throttle real upstream calls.
const PRICE_STALE_TIME_MS = 1000 * 60 * 5;

// Mirrors backend logic for converting "active symbol count" into a TTL
// in hours. Kept in sync manually — see backend investments module.
const computeCacheHours = (symbolCount: number): number =>
  Math.max(1, Math.ceil((symbolCount * 24) / 25));

const investmentPriceKey = (symbol: string) =>
  ['investmentPrice', symbol] as const;

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

export interface InvestmentCacheInfo {
  /** Unix ms timestamp of the last cached price for the symbol, or null. */
  lastUpdated: number | null;
  /** Backend-aligned cache window for this dataset, in hours. */
  cacheHours: number;
  /** Unix ms timestamp at which a fresh fetch is expected, or null when uncached. */
  nextRefreshAt: number | null;
}

export interface UseInvestmentPricesResult {
  investmentData: Map<string, InvestmentData>;
  /** True while the account's symbol is being refreshed (shared across cards). */
  isRefreshing: (accountId: string) => boolean;
  /** Single-click refresh — per-symbol cooldown applies. */
  handleRefreshPrice: (account: Account) => Promise<void>;
  /** Cache freshness data for a symbol, used to render next-refresh hints. */
  getCacheInfo: (symbol: string) => InvestmentCacheInfo;
}

/**
 * Loads stock/ETF prices for all investment accounts via TanStack Query so
 * each symbol is fetched once and cached for `PRICE_STALE_TIME_MS`. Pocket-
 * level derived values (montoInvertido, shares, gains) are recomputed
 * locally on each pocket change without re-hitting the network — this is
 * the main performance win over the previous useEffect-based loader, which
 * refetched every price whenever `accounts` or `pockets` references churned.
 *
 * `handleRefreshPrice` is a single-click action that invalidates the cached
 * query and refetches. State (cooldowns, in-flight set) is keyed by SYMBOL,
 * so two accounts holding VOO share both the cooldown and the spinner.
 */
export const useInvestmentPrices = ({
  accounts,
  pockets,
  toast,
}: UseInvestmentPricesParams): UseInvestmentPricesResult => {
  const queryClient = useQueryClient();
  // Symbol-keyed (not account-keyed) so refreshing VOO lights up every
  // card that holds VOO simultaneously.
  const [refreshingSymbols, setRefreshingSymbols] = useState<Set<string>>(
    new Set()
  );
  const [lastRefreshBySymbol, setLastRefreshBySymbol] = useState<
    Map<string, number>
  >(new Map());

  // Investment accounts that actually have a tradable symbol. Memoized so
  // useQueries' query list stays stable across unrelated account churn.
  const investmentAccounts = useMemo(
    () =>
      accounts.filter(
        (acc) => acc.type === 'investment' && !!acc.stockSymbol
      ),
    [accounts]
  );

  // accountId -> symbol lookup powers `isRefreshing(accountId)` without
  // forcing consumers to know the symbol mapping themselves.
  const symbolByAccountId = useMemo(() => {
    const m = new Map<string, string>();
    for (const acc of investmentAccounts) {
      if (acc.stockSymbol) m.set(acc.id, acc.stockSymbol);
    }
    return m;
  }, [investmentAccounts]);

  // Distinct symbol count — a single ticker held by multiple accounts only
  // counts once, matching the backend's view of "active symbols" for TTL.
  const distinctSymbolCount = useMemo(() => {
    const symbols = new Set<string>();
    for (const acc of investmentAccounts) {
      if (acc.stockSymbol) symbols.add(acc.stockSymbol);
    }
    return symbols.size;
  }, [investmentAccounts]);

  const cacheHours = useMemo(
    () => computeCacheHours(distinctSymbolCount),
    [distinctSymbolCount]
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

  const isRefreshing = useCallback(
    (accountId: string): boolean => {
      const symbol = symbolByAccountId.get(accountId);
      if (!symbol) return false;
      return refreshingSymbols.has(symbol);
    },
    [symbolByAccountId, refreshingSymbols]
  );

  const getCacheInfo = useCallback(
    (symbol: string): InvestmentCacheInfo => {
      const lastUpdated = investmentService.getPriceTimestamp(symbol);
      const nextRefreshAt =
        lastUpdated !== null ? lastUpdated + cacheHours * 3_600_000 : null;
      return { lastUpdated, cacheHours, nextRefreshAt };
    },
    [cacheHours]
  );

  // Memoized so the handler keeps a stable identity when its inputs don't
  // change. Memoized children receiving onRefresh (e.g. InvestmentCard) can
  // then skip re-renders on unrelated parent updates.
  const handleRefreshPrice = useCallback(
    async (account: Account) => {
      if (!account.stockSymbol) return;
      const symbol = account.stockSymbol;

      const now = Date.now();
      const lastForSymbol = lastRefreshBySymbol.get(symbol) ?? 0;
      const sinceLast = now - lastForSymbol;

      if (sinceLast < REFRESH_COOLDOWN_MS) {
        const secondsLeft = Math.ceil(
          (REFRESH_COOLDOWN_MS - sinceLast) / 1000
        );
        toast.error(
          `Please wait ${secondsLeft} seconds before refreshing again`
        );
        return;
      }

      // Stamp the cooldown immediately so concurrent clicks (across
      // siblings holding the same symbol) don't all slip through.
      setLastRefreshBySymbol((prev) => {
        const next = new Map(prev);
        next.set(symbol, now);
        return next;
      });
      setRefreshingSymbols((prev) => {
        const next = new Set(prev);
        next.add(symbol);
        return next;
      });

      try {
        // invalidateQueries triggers a refetch via the registered queryFn
        // (investmentService.getCurrentPrice) and resolves once the active
        // query has finished. The fresh value then sits in the query cache
        // for the toast below and propagates to consumers via priceQueries.
        await queryClient.invalidateQueries({
          queryKey: investmentPriceKey(symbol),
        });

        const price =
          queryClient.getQueryData<number>(investmentPriceKey(symbol)) ?? 0;

        toast.success(
          `Price refreshed: ${symbol} = ${currencyService.formatCurrency(
            price,
            account.currency
          )}`
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to refresh price'
        );
      } finally {
        setRefreshingSymbols((prev) => {
          const next = new Set(prev);
          next.delete(symbol);
          return next;
        });
      }
    },
    [lastRefreshBySymbol, queryClient, toast]
  );

  return {
    investmentData,
    isRefreshing,
    handleRefreshPrice,
    getCacheInfo,
  };
};
