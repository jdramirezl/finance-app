import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { Account, Pocket } from '../../types';

/**
 * Tests for {@link useInvestmentPrices}. The hook uses TanStack Query's
 * `useQueries` to fetch one price per investment symbol, combines results
 * with pocket-derived `montoInvertido` / `shares`, and exposes a
 * triple-click force-refresh handler with a per-symbol cooldown.
 *
 * `investmentService` is mocked so we can drive query outcomes deterministically
 * without touching the real network. Each test wraps the hook in its own
 * QueryClient to avoid bleed-over of cached prices between cases.
 *
 * Click counters: each invocation of `handleRefreshPrice` reads
 * `clickCounts` from the closure captured at render time, so progressing
 * the count requires letting React re-render between clicks. Tests use
 * separate `await act(...)` blocks to flush state updates and re-acquire
 * `result.current.handleRefreshPrice` with the latest closure.
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
    it('shows a 2-clicks-remaining toast on the first click', async () => {
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

      // The click counter only governs the leading info toast — the
      // refresh itself runs on every click, so the success toast fires too.
      // The "force " prefix is only added when clickCount hit the threshold.
      expect(toast.info).toHaveBeenCalledWith('2 more clicks to force refresh');
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Price refreshed: VOO'),
      );
      expect(toast.success).not.toHaveBeenCalledWith(
        expect.stringContaining('force refreshed'),
      );
    });

    it('progresses through the click prompts and force-refreshes on the third click', async () => {
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

      // Each click is its own act so React flushes state and the
      // captured `clickCounts` closure progresses between calls.
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      expect(toast.info).toHaveBeenCalledWith('2 more clicks to force refresh');
      expect(toast.info).toHaveBeenCalledWith('1 more click to force refresh');
      expect(toast.info).toHaveBeenCalledWith('Forcing refresh...');
      // Successful invalidation surfaces the formatted price toast.
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('force refreshed: VOO'),
      );
    });

    it('rejects a second force refresh while inside the cooldown window', async () => {
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

      // First triple-click triggers a real force refresh.
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      toast.error.mockClear();

      // Second triple-click sequence — the third click hits the cooldown
      // because lastForceRefresh was just stamped milliseconds ago.
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });
      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /Please wait \d+ seconds before force refreshing again/,
        ),
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

    it('starts with an empty refreshingPrices set and does not leak entries after success', async () => {
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

      expect(result.current.refreshingPrices.size).toBe(0);

      await act(async () => {
        await result.current.handleRefreshPrice(account);
      });

      // The finally block must clear the entry so the spinner doesn't
      // stick on the card after the refresh completes.
      await waitFor(() =>
        expect(result.current.refreshingPrices.has('inv-1')).toBe(false),
      );
    });
  });
});
