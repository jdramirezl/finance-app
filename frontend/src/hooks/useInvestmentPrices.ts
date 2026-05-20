import { useCallback, useEffect, useState } from 'react';
import { currencyService } from '../services/currencyService';
import { investmentService } from '../services/investmentService';
import type { Account, Pocket } from '../types';
import type { InvestmentData } from '../components/summary';
import type { useToast } from './useToast';

const CLICK_TIMEOUT = 2000; // 2 seconds window for triple-click
const FORCE_REFRESH_COOLDOWN = 60000; // 1 minute cooldown
const FORCE_CLICK_THRESHOLD = 3;

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
 * Loads stock/ETF prices for all investment accounts and exposes a
 * triple-click-to-force-refresh handler. The initial useEffect uses an
 * `ignore` flag so a stale request can't overwrite state when the deps
 * change while it is in flight.
 */
export const useInvestmentPrices = ({
  accounts,
  pockets,
  toast,
}: UseInvestmentPricesParams): UseInvestmentPricesResult => {
  const [investmentData, setInvestmentData] = useState<Map<string, InvestmentData>>(
    new Map()
  );
  const [refreshingPrices, setRefreshingPrices] = useState<Set<string>>(new Set());
  const [clickCounts, setClickCounts] = useState<Map<string, ClickEntry>>(new Map());
  const [lastForceRefresh, setLastForceRefresh] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    let ignore = false;

    const loadInvestmentPrices = async () => {
      const investmentAccounts = accounts.filter(
        (acc) => acc.type === 'investment' && acc.stockSymbol
      );
      if (investmentAccounts.length === 0) {
        if (!ignore) setInvestmentData(new Map());
        return;
      }

      // Fetch prices in parallel — sequential awaits previously serialized requests.
      const results = await Promise.all(
        investmentAccounts.map(async (account) => {
          const { montoInvertido, shares } = findInvestmentPocketBalances(
            account.id,
            pockets
          );
          const accountWithCorrectValues = { ...account, montoInvertido, shares };

          try {
            if (!account.stockSymbol) return null;
            const data = await investmentService.updateInvestmentAccount(
              accountWithCorrectValues
            );
            return {
              id: account.id,
              data: { ...data, montoInvertido, shares } satisfies InvestmentData,
            };
          } catch {
            // Failure fallback — surface zero price with negative gains so UI
            // degrades gracefully rather than crashing the whole summary.
            return {
              id: account.id,
              data: {
                precioActual: 0,
                totalValue: 0,
                gainsUSD: -montoInvertido,
                gainsPct: -100,
                lastUpdated: null,
                montoInvertido,
                shares,
              } satisfies InvestmentData,
            };
          }
        })
      );

      if (ignore) return;

      const newData = new Map<string, InvestmentData>();
      for (const entry of results) {
        if (entry) newData.set(entry.id, entry.data);
      }
      setInvestmentData(newData);
    };

    loadInvestmentPrices();

    return () => {
      ignore = true;
    };
  }, [accounts, pockets]);

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

      setRefreshingPrices((prev) => new Set(prev).add(account.id));

      try {
        const { montoInvertido, shares } = findInvestmentPocketBalances(
          account.id,
          pockets
        );
        const accountWithCorrectValues = { ...account, montoInvertido, shares };

        const isForceRefresh = clickCount >= FORCE_CLICK_THRESHOLD;
        const price = isForceRefresh
          ? await investmentService.forceRefreshPrice(account.stockSymbol)
          : await investmentService.getCurrentPrice(account.stockSymbol);

        const values = investmentService.calculateInvestmentValues(
          accountWithCorrectValues,
          price
        );
        const lastUpdated = investmentService.getPriceTimestamp(account.stockSymbol);

        setInvestmentData((prev) => {
          const next = new Map(prev);
          next.set(account.id, {
            precioActual: price,
            ...values,
            lastUpdated,
            montoInvertido,
            shares,
          });
          return next;
        });

        toast.success(
          `Price ${isForceRefresh ? 'force ' : ''}refreshed: ${account.stockSymbol} = ${currencyService.formatCurrency(price, account.currency)}`
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to refresh price');
      } finally {
        setRefreshingPrices((prev) => {
          const next = new Set(prev);
          next.delete(account.id);
          return next;
        });
      }
    },
    [clickCounts, lastForceRefresh, pockets, toast]
  );

  return {
    investmentData,
    refreshingPrices,
    handleRefreshPrice,
  };
};
