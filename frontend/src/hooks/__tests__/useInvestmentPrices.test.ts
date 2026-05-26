import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Account, Pocket } from '../../types';

/**
 * Tests for {@link useInvestmentPrices}. The hook uses TanStack Query's
 * `useQueries` to fetch one price per investment symbol, combines results
 * with pocket-derived `montoInvertido` / `shares`, and exposes a
 * single-click refresh handler with a per-symbol cooldown plus cache-info
 * lookup for the next-refresh hint.
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
    it('refreshes immediately on a single click and surfaces a success toast', async () => {
      vi.mocked(investmentService.getCurrentPrice).mockResolvedValue(123.45);
      const toast = makeToast();
      const account = makeAccount({ id: 'inv-1' });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account],
            pockets: [],
            toast: toast as never,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      // Single click triggers the refresh — no "X more clicks" prompts.
      expect(toast.info).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Price refreshed: VOO'),
      );
    });

    it('blocks a second refresh inside the per-symbol cooldown window', async () => {
      vi.mocked(investmentService.getCurrentPrice).mockResolvedValue(100);
      const toast = makeToast();
      const account = makeAccount({ id: 'inv-1' });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account],
            pockets: [],
            toast: toast as never,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });
      toast.error.mockClear();

      // Second click lands well inside the 60s cooldown — refresh is
      // rejected and the user sees a wait-time message.
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Please wait \d+ seconds before refreshing again/),
      );
      // The upstream service should only have been hit once.
      expect(investmentService.getCurrentPrice).toHaveBeenCalledTimes(1);
    });

    it('shares the cooldown across accounts holding the same symbol', async () => {
      vi.mocked(investmentService.getCurrentPrice).mockResolvedValue(100);
      const toast = makeToast();
      const accountA = makeAccount({ id: 'inv-a', stockSymbol: 'VOO' });
      const accountB = makeAccount({ id: 'inv-b', stockSymbol: 'VOO' });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [accountA, accountB],
            pockets: [],
            toast: toast as never,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleRefreshPrice(accountA);
      });
      toast.error.mockClear();

      // Refreshing the *other* account that shares the symbol must hit the
      // same cooldown — that's the whole point of keying state by symbol.
      await act(async () => {
        await result.current.handleRefreshPrice(accountB);
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Please wait \d+ seconds before refreshing again/),
      );
    });

    it('returns silently when the account has no stockSymbol', async () => {
      const toast = makeToast();
      const account = makeAccount({ id: 'noinv', stockSymbol: undefined });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account],
            pockets: [],
            toast: toast as never,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      // No toast at all — the early return means the click never registered.
      expect(toast.info).not.toHaveBeenCalled();
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
        vi.mocked(investmentService.getCurrentPrice).mockImplementation(
          () =>
            new Promise<number>((resolve) => {
              setTimeout(() => resolve(100), 10_000);
            }),
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
    it('exposes a 1h window when there is a single symbol', () => {
      vi.mocked(investmentService.getPriceTimestamp).mockReturnValue(1_000_000);
      const account = makeAccount({ id: 'inv-1', stockSymbol: 'VOO' });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account],
            pockets: [],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      const info = result.current.getCacheInfo('VOO');
      // ceil(1 * 24 / 25) = 1, and the formula floors at 1 anyway.
      expect(info.cacheHours).toBe(1);
      expect(info.lastUpdated).toBe(1_000_000);
      // nextRefreshAt = lastUpdated + cacheHours * 1h-in-ms.
      expect(info.nextRefreshAt).toBe(1_000_000 + 60 * 60 * 1000);
    });

    it('scales the window with the distinct symbol count', () => {
      vi.mocked(investmentService.getPriceTimestamp).mockReturnValue(0);
      // 26 distinct symbols → ceil(26 * 24 / 25) = 25 hours.
      const accounts = Array.from({ length: 26 }, (_, i) =>
        makeAccount({ id: `inv-${i}`, stockSymbol: `SYM${i}` }),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts,
            pockets: [],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      expect(result.current.getCacheInfo('SYM0').cacheHours).toBe(25);
    });

    it('counts duplicate symbols only once in the cache window calculation', () => {
      vi.mocked(investmentService.getPriceTimestamp).mockReturnValue(0);
      // Two accounts share VOO — distinct symbol count is still 1.
      const accountA = makeAccount({ id: 'inv-a', stockSymbol: 'VOO' });
      const accountB = makeAccount({ id: 'inv-b', stockSymbol: 'VOO' });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [accountA, accountB],
            pockets: [],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      expect(result.current.getCacheInfo('VOO').cacheHours).toBe(1);
    });

    it('returns null timestamps when the symbol has never been fetched', () => {
      vi.mocked(investmentService.getPriceTimestamp).mockReturnValue(null);
      const account = makeAccount({ id: 'inv-1', stockSymbol: 'VOO' });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useInvestmentPrices({
            accounts: [account],
            pockets: [],
            toast: makeToast() as never,
          }),
        { wrapper },
      );

      const info = result.current.getCacheInfo('VOO');
      expect(info.lastUpdated).toBeNull();
      // nextRefreshAt has nothing to anchor to without lastUpdated.
      expect(info.nextRefreshAt).toBeNull();
    });
  });
});
