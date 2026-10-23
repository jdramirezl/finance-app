import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Account, Pocket } from '../../types';

/**
 * Tests for {@link useInvestmentPrices}. The hook uses TanStack Query's
 * `useQueries` to fetch one price per investment symbol, combines results
 * with pocket-derived `montoInvertido` / `shares`, and exposes a
 * single-click forced refresh (no cooldown) plus cache-info lookup for the
 * freshness label.
 *
 * `investmentService` is mocked so we can drive query outcomes deterministically
 * without touching the real network. Each test wraps the hook in its own
 * QueryClient to avoid bleed-over of cached prices between cases.
 */

vi.mock('../../services/investmentService', () => ({
  investmentService: {
    getCurrentPrice: vi.fn(),
    calculateInvestmentValues: vi.fn(
      (account: Account, price: number) => ({
        totalValue: (account.shares || 0) * price,
        gainsUSD: (account.shares || 0) * price - (account.montoInvertido || 0),
        gainsPct: 0,
      }),
    ),
    getPriceTimestamp: vi.fn(() => 1234567890),
    getPriceDetails: vi.fn(),
    getPriceInfo: vi.fn(() => null),
  },
}));

vi.mock('../../services/currencyService', () => ({
  currencyService: {
    formatCurrency: vi.fn(
      (value: number, currency: string) => `${currency} ${value}`,
    ),
  },
}));

import { useInvestmentPrices } from '../useInvestmentPrices';
import { investmentService } from '../../services/investmentService';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Investments',
  color: '#000',
  currency: 'USD',
  balance: 1000,
  type: 'investment',
  stockSymbol: 'VOO',
  ...overrides,
});

const investedPocket = (accountId: string, balance: number): Pocket => ({
  id: `${accountId}-inv`,
  accountId,
  name: 'Invested Money',
  type: 'normal',
  balance,
  currency: 'USD',
});

const sharesPocket = (accountId: string, balance: number): Pocket => ({
  id: `${accountId}-shares`,
  accountId,
  name: 'Shares',
  type: 'normal',
  balance,
  currency: 'USD',
});

const makeToast = () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
};

describe('useInvestmentPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(investmentService.getPriceTimestamp).mockReturnValue(1234567890);
    // Default to a resolved price so investment-account fixtures don't
    // crash useQueries during render — individual tests override as needed.
    vi.mocked(investmentService.getCurrentPrice).mockResolvedValue(100);
  });

  describe('investmentData mapping', () => {
    it('returns an empty map when no accounts are investments', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [makeAccount({ type: 'normal', stockSymbol: undefined })],
            pockets: [],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      expect(result.current.investmentData.size).toBe(0);
      expect(investmentService.getCurrentPrice).not.toHaveBeenCalled();
    });

    it('skips investment accounts without a stockSymbol', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [makeAccount({ stockSymbol: undefined })],
            pockets: [],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      expect(result.current.investmentData.size).toBe(0);
      expect(investmentService.getCurrentPrice).not.toHaveBeenCalled();
    });

    it('exposes resolved price + pocket-derived values once the query succeeds', async () => {
      vi.mocked(investmentService.getCurrentPrice).mockResolvedValue(550);
      const account = makeAccount({ id: 'inv-1', stockSymbol: 'VOO' });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account],
            pockets: [
              investedPocket('inv-1', 1000),
              sharesPocket('inv-1', 2),
            ],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.investmentData.size).toBe(1));

      const data = result.current.investmentData.get('inv-1');
      expect(data).toMatchObject({
        precioActual: 550,
        montoInvertido: 1000,
        shares: 2,
        // calculateInvestmentValues mock: shares * price = 2 * 550 = 1100;
        // gainsUSD = totalValue - montoInvertido = 1100 - 1000 = 100.
        totalValue: 1100,
        gainsUSD: 100,
      });
      expect(data?.lastUpdated).toBe(1234567890);
    });

    it('falls back to a zero-price entry with -100% gains on query failure', async () => {
      vi.mocked(investmentService.getCurrentPrice).mockRejectedValue(
        new Error('boom'),
      );
      const account = makeAccount({ id: 'inv-1', stockSymbol: 'VOO' });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account],
            pockets: [
              investedPocket('inv-1', 800),
              sharesPocket('inv-1', 1),
            ],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.investmentData.size).toBe(1));

      // Failure shape: zero price, full loss vs invested money. The UI
      // relies on this so the rest of the summary still renders rather
      // than crashing on `undefined.totalValue`.
      expect(result.current.investmentData.get('inv-1')).toEqual({
        precioActual: 0,
        totalValue: 0,
        gainsUSD: -800,
        gainsPct: -100,
        lastUpdated: null,
        montoInvertido: 800,
        shares: 1,
      });
    });

    it('leaves entries off the map while queries are pending', async () => {
      // Never-resolving promise simulates an in-flight fetch.
      vi.mocked(investmentService.getCurrentPrice).mockImplementation(
        () => new Promise<number>(() => {}),
      );

      const account = makeAccount({ id: 'inv-1', stockSymbol: 'VOO' });
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account],
            pockets: [investedPocket('inv-1', 100), sharesPocket('inv-1', 1)],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      // Pending → no entry. Prevents the UI from flashing zeros on first paint.
      expect(result.current.investmentData.size).toBe(0);
    });
  });

  describe('handleRefreshPrice', () => {
    const details = (overrides: Record<string, unknown> = {}) => ({
      symbol: 'VOO',
      price: 699.1,
      cachedAt: 1_792_783_326_000,
      source: 'api',
      stale: false,
      staleReason: null,
      freshUntil: null,
      provider: 'finnhub',
      ...overrides,
    });

    const setup = (accounts: Account[]) => {
      const toast = makeToast();
      const { wrapper, queryClient } = createWrapper();
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(
        () => useInvestmentPrices({ accounts, pockets: [], toast: toast as never }),
        { wrapper },
      );
      return { toast, queryClient, invalidate, result };
    };

    it('forces a market fetch on a single click and updates the dashboard', async () => {
      vi.mocked(investmentService.getPriceDetails).mockResolvedValue(details() as never);
      const account = makeAccount({ id: 'inv-1' });
      const { toast, queryClient, invalidate, result } = setup([account]);

      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      expect(investmentService.getPriceDetails).toHaveBeenCalledWith('VOO', true);
      expect(queryClient.getQueryData(['investmentPrice', 'VOO'])).toBe(699.1);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] });
      expect(toast.success).toHaveBeenCalledWith('VOO USD 699.1 · updated from Finnhub');
      expect(toast.info).not.toHaveBeenCalled();
    });

    it('allows repeated forced refreshes with no cooldown', async () => {
      vi.mocked(investmentService.getPriceDetails).mockResolvedValue(details() as never);
      const account = makeAccount({ id: 'inv-1' });
      const { toast, result } = setup([account]);

      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.handleRefreshPrice(account);
        });
      }

      expect(investmentService.getPriceDetails).toHaveBeenCalledTimes(3);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('ignores a click while the same symbol is already refreshing', async () => {
      let resolve!: (v: unknown) => void;
      vi.mocked(investmentService.getPriceDetails).mockReturnValue(
        new Promise((r) => { resolve = r; }) as never,
      );
      const accountA = makeAccount({ id: 'inv-a', stockSymbol: 'VOO' });
      const accountB = makeAccount({ id: 'inv-b', stockSymbol: 'VOO' });
      const { result } = setup([accountA, accountB]);

      let first: Promise<void> | undefined;
      await act(async () => {
        first = result.current.handleRefreshPrice(accountA);
        await result.current.handleRefreshPrice(accountB);
      });
      await act(async () => {
        resolve(details());
        await first;
      });

      expect(investmentService.getPriceDetails).toHaveBeenCalledTimes(1);
    });

    it('warns with the reason and saved time when only a stale price is available', async () => {
      const cachedAt = 1_792_700_000_000;
      vi.mocked(investmentService.getPriceDetails).mockResolvedValue(
        details({ source: 'stale', stale: true, staleReason: 'RATE_LIMITED', cachedAt, provider: null }) as never,
      );
      const account = makeAccount({ id: 'inv-1' });
      const { toast, result } = setup([account]);

      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      const time = new Date(cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      expect(toast.warning).toHaveBeenCalledWith(
        `Couldn't get a new VOO price (provider limit reached). Showing the ${time} price.`,
      );
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('shows the server reason without the request prefix when no price exists', async () => {
      vi.mocked(investmentService.getPriceDetails).mockRejectedValue(
        new Error('GET /api/investments/prices/VOO?force=true failed: Stock price for VOO is temporarily unavailable (price provider rate limit reached)'),
      );
      const account = makeAccount({ id: 'inv-1' });
      const { toast, result } = setup([account]);

      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Stock price for VOO is temporarily unavailable (price provider rate limit reached)',
      );
      expect(result.current.isRefreshing('inv-1')).toBe(false);
    });

    it('returns silently when the account has no stockSymbol', async () => {
      const account = makeAccount({ id: 'noinv', stockSymbol: undefined });
      const { toast, result } = setup([account]);

      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      expect(investmentService.getPriceDetails).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('isRefreshing', () => {
    it('returns false for accounts with no symbol or before any refresh starts', () => {
      const account = makeAccount({ id: 'inv-1' });
      const accountNoSym = makeAccount({ id: 'inv-2', stockSymbol: undefined });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account, accountNoSym],
            pockets: [],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      expect(result.current.isRefreshing('inv-1')).toBe(false);
      expect(result.current.isRefreshing('inv-2')).toBe(false);
      expect(result.current.isRefreshing('unknown')).toBe(false);
    });

    it('reports true for every account holding the symbol while a refresh is in flight', async () => {
      // Fake timers let us suspend the queryFn indefinitely without a
      // real promise that has to be drained — the previous live-promise
      // approach left state dangling between tests when the act window
      // ended before the spinner cleared, breaking later cases.
      vi.useFakeTimers();
      try {
        vi.mocked(investmentService.getPriceDetails).mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve({ symbol: 'VOO', price: 100, cachedAt: 0, stale: false, staleReason: null, freshUntil: null, provider: 'finnhub' }), 10_000);
            }) as never,
        );
        const accountA = makeAccount({ id: 'inv-a', stockSymbol: 'VOO' });
        const accountB = makeAccount({ id: 'inv-b', stockSymbol: 'VOO' });
        const accountC = makeAccount({ id: 'inv-c', stockSymbol: 'AAPL' });

        const { wrapper } = createWrapper();
        const { result } = renderHook(
          () =>
            useInvestmentPrices({
              accounts: [accountA, accountB, accountC],
              pockets: [],
              toast: makeToast() as never,
            }),
          { wrapper },
        );

        // Fire the refresh — synchronous prefix sets refreshingSymbols
        // before the await of invalidateQueries. The state update
        // commits when act unwinds.
        let pending: Promise<void> | undefined;
        await act(async () => {
          pending = result.current.handleRefreshPrice(accountA);
          // Yield to React's scheduler so the queued state update flushes.
          await Promise.resolve();
        });

        // Both VOO accounts spin together; the AAPL account stays idle.
        // This is the core "cross-card spinner" guarantee.
        expect(result.current.isRefreshing('inv-a')).toBe(true);
        expect(result.current.isRefreshing('inv-b')).toBe(true);
        expect(result.current.isRefreshing('inv-c')).toBe(false);

        // Drain — advance fake timers to resolve the queryFn, then await.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10_000);
          await pending;
        });

        // After completion the spinner clears for the whole symbol family.
        expect(result.current.isRefreshing('inv-a')).toBe(false);
        expect(result.current.isRefreshing('inv-b')).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('getCacheInfo', () => {
    it('returns the backend freshness and provenance for the symbol', () => {
      vi.mocked(investmentService.getPriceInfo).mockReturnValue({
        symbol: 'VOO',
        price: 1,
        timestamp: 1_000_000,
        stale: true,
        staleReason: 'RATE_LIMITED',
        provider: 'finnhub',
        freshUntil: 2_000_000,
      });
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useInvestmentPrices({ accounts: [makeAccount()], pockets: [], toast: makeToast() as never }),
        { wrapper },
      );

      expect(result.current.getCacheInfo('VOO')).toEqual({
        lastUpdated: 1_000_000,
        nextRefreshAt: 2_000_000,
        stale: true,
        staleReason: 'RATE_LIMITED',
        provider: 'finnhub',
      });
    });

    it('returns nulls when the symbol has never been fetched', () => {
      vi.mocked(investmentService.getPriceInfo).mockReturnValue(null);
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useInvestmentPrices({ accounts: [makeAccount()], pockets: [], toast: makeToast() as never }),
        { wrapper },
      );

      expect(result.current.getCacheInfo('VOO')).toEqual({
        lastUpdated: null,
        nextRefreshAt: null,
        stale: false,
        staleReason: null,
        provider: null,
      });
    });
  });
});
