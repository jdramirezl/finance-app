import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { currencyService } from '../services/currencyService';
import { investmentService } from '../services/investmentService';
import type { Account, Pocket } from '../types';
import type { InvestmentData } from '../components/summary';
import type { useToast } from './useToast';
import {
  formatClock,
  providerLabel,
  staleReasonLabel,
} from '../components/summary/investmentCacheLabel';

// "Sync with the backend" is automatic: after 5 minutes the query is stale
// and TanStack refetches on mount / window focus. The backend owns the
// market-provider cache window and returns it as `freshUntil`.
const PRICE_STALE_TIME_MS = 1000 * 60 * 5;

export const investmentPriceKey = (symbol: string) =>
  ['investmentPrice', symbol] as const;

/** Strip the apiClient "GET /path failed: " prefix so toasts read naturally. */
const serverMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^[A-Z]+ \S+ failed: /, '');
};

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
  /** Unix ms when the price was fetched from the market, or null if never. */
  lastUpdated: number | null;
  /** Unix ms when the backend's automatic cache window ends, or null. */
  nextRefreshAt: number | null;
  /** True when the last refresh failed and this is the last saved price. */
  stale: boolean;
  /** Provider failure code behind a stale price (e.g. RATE_LIMITED). */
  staleReason: string | null;
  /** Provider that produced the price (e.g. "finnhub"), when known. */
  provider: string | null;
}

export interface UseInvestmentPricesResult {
  investmentData: Map<string, InvestmentData>;
  /** True while the account's symbol is being refreshed (shared across cards). */
  isRefreshing: (accountId: string) => boolean;
  /** Single click: fetch a new market price now (no cooldown). */
  handleRefreshPrice: (account: Account) => Promise<void>;
  /** Freshness/provenance for a symbol, used for the label under the price. */
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
 * `handleRefreshPrice` asks the backend to skip its cache and call the
 * market provider now, then pushes the result into every view. The
 * in-flight set is keyed by SYMBOL, so two accounts holding VOO share the
 * spinner and a click while a refresh is running is ignored.
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
  // Ref mirror of refreshingSymbols so two clicks in the same render tick
  // can't both start a request.
  const inFlightRef = useRef<Set<string>>(new Set());

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
      const info = investmentService.getPriceInfo(symbol);
      return {
        lastUpdated: info?.timestamp ?? null,
        nextRefreshAt: info?.freshUntil ?? null,
        stale: info?.stale ?? false,
        staleReason: info?.staleReason ?? null,
        provider: info?.provider ?? null,
      };
    },
    // Re-derive whenever price data changes so cards re-render the label.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queriesSignature]
  );

  // Memoized so the handler keeps a stable identity when its inputs don't
  // change. Memoized children receiving onRefresh (e.g. InvestmentCard) can
  // then skip re-renders on unrelated parent updates.
  const handleRefreshPrice = useCallback(
    async (account: Account) => {
      if (!account.stockSymbol) return;
      const symbol = account.stockSymbol;
      if (inFlightRef.current.has(symbol)) return;

      inFlightRef.current.add(symbol);
      setRefreshingSymbols((prev) => new Set(prev).add(symbol));

      try {
        const details = await investmentService.getPriceDetails(symbol, true);
        // Push the new price into every card/total (cancelling any older
        // fetch still in flight so it can't overwrite it), and resync the
        // backend-computed account balances.
        await queryClient.cancelQueries({ queryKey: investmentPriceKey(symbol) });
        queryClient.setQueryData(investmentPriceKey(symbol), details.price);
        void queryClient.invalidateQueries({ queryKey: ['accounts'] });

        if (details.stale) {
          toast.warning(
            `Couldn't get a new ${symbol} price (${staleReasonLabel(details.staleReason)}). ` +
              `Showing the ${formatClock(details.cachedAt)} price.`
          );
        } else {
          const from = providerLabel(details.provider);
          toast.success(
            `${symbol} ${currencyService.formatCurrency(details.price, account.currency)}` +
              (from ? ` · updated from ${from}` : ' · updated')
          );
        }
      } catch (error) {
        toast.error(serverMessage(error));
      } finally {
        inFlightRef.current.delete(symbol);
        setRefreshingSymbols((prev) => {
          const next = new Set(prev);
          next.delete(symbol);
          return next;
        });
      }
    },
    [queryClient, toast]
  );

  return {
    investmentData,
    isRefreshing,
    handleRefreshPrice,
    getCacheInfo,
  };
};
