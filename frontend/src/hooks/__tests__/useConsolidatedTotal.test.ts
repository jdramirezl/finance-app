import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConsolidatedTotal } from '../useConsolidatedTotal';
import { currencyService } from '../../services/currencyService';
import type { Account } from '../../types';
import type { InvestmentData } from '../../components/summary';

vi.mock('../../services/currencyService', () => ({
  currencyService: { convertBatch: vi.fn() },
}));

vi.mock('../../services/cdCalculationService', () => ({
  cdCalculationService: {
    calculateCurrentValue: vi.fn(() => ({ currentValue: 500, netCurrentValue: 450 })),
  },
}));

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Test',
  color: '#000',
  currency: 'USD',
  balance: 1000,
  type: 'normal',
  ...overrides,
});

describe('useConsolidatedTotal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero with isConsolidatedReady true when accounts is empty', async () => {
    const { result } = renderHook(() =>
      useConsolidatedTotal({
        accounts: [],
        primaryCurrency: 'USD',
        investmentData: new Map(),
      }),
    );

    expect(result.current.consolidatedTotal).toBe(0);
    expect(result.current.isConsolidatedReady).toBe(true);
    expect(result.current.sortedCurrencies).toEqual([]);
  });

  it('sums balances directly when all accounts share primary currency', async () => {
    const accounts = [
      makeAccount({ id: 'a1', balance: 100 }),
      makeAccount({ id: 'a2', balance: 250 }),
    ];

    const { result } = renderHook(() =>
      useConsolidatedTotal({
        accounts,
        primaryCurrency: 'USD',
        investmentData: new Map(),
      }),
    );

    await waitFor(() => expect(result.current.isConsolidatedReady).toBe(true));
    expect(result.current.consolidatedTotal).toBe(350);
    expect(result.current.totalsByCurrency).toEqual({ USD: 350 });
    expect(currencyService.convertBatch).not.toHaveBeenCalled();
  });

  it('converts foreign currencies via convertBatch', async () => {
    vi.mocked(currencyService.convertBatch).mockResolvedValue([
      { convertedAmount: 50, rate: 0.05 },
    ]);

    const accounts = [
      makeAccount({ id: 'a1', balance: 200, currency: 'USD' }),
      makeAccount({ id: 'a2', balance: 1000, currency: 'MXN' }),
    ];

    const { result } = renderHook(() =>
      useConsolidatedTotal({
        accounts,
        primaryCurrency: 'USD',
        investmentData: new Map(),
      }),
    );

    await waitFor(() => expect(result.current.isConsolidatedReady).toBe(true));
    expect(result.current.consolidatedTotal).toBe(250); // 200 USD + 50 converted
    expect(currencyService.convertBatch).toHaveBeenCalledWith([
      { amount: 1000, from: 'MXN', to: 'USD' },
    ]);
  });

  it('uses investmentData totalValue for investment accounts', async () => {
    const investmentAccount = makeAccount({
      id: 'inv-1',
      type: 'investment',
      stockSymbol: 'VOO',
      balance: 100,
    });

    const investmentData = new Map<string, InvestmentData>([
      ['inv-1', { precioActual: 500, totalValue: 5000, gainsUSD: 200, gainsPct: 4, lastUpdated: null }],
    ]);

    const { result } = renderHook(() =>
      useConsolidatedTotal({
        accounts: [investmentAccount],
        primaryCurrency: 'USD',
        investmentData,
      }),
    );

    await waitFor(() => expect(result.current.isConsolidatedReady).toBe(true));
    expect(result.current.consolidatedTotal).toBe(5000);
    expect(result.current.getAccountBalance(investmentAccount)).toBe(5000);
  });

  it('falls back to account.balance for investment accounts without data', async () => {
    const investmentAccount = makeAccount({
      id: 'inv-2',
      type: 'investment',
      stockSymbol: 'AAPL',
      balance: 300,
    });

    const { result } = renderHook(() =>
      useConsolidatedTotal({
        accounts: [investmentAccount],
        primaryCurrency: 'USD',
        investmentData: new Map(),
      }),
    );

    await waitFor(() => expect(result.current.isConsolidatedReady).toBe(true));
    expect(result.current.getAccountBalance(investmentAccount)).toBe(300);
  });

  it('groups accounts by currency and sorts investment currencies first', async () => {
    const accounts = [
      makeAccount({ id: 'a1', currency: 'MXN', balance: 500 }),
      makeAccount({ id: 'a2', currency: 'USD', balance: 100, type: 'investment', stockSymbol: 'VOO' }),
      makeAccount({ id: 'a3', currency: 'EUR', balance: 200 }),
    ];

    vi.mocked(currencyService.convertBatch).mockResolvedValue([
      { convertedAmount: 25, rate: 0.05 },
      { convertedAmount: 220, rate: 1.1 },
    ]);

    const { result } = renderHook(() =>
      useConsolidatedTotal({
        accounts,
        primaryCurrency: 'MXN',
        investmentData: new Map(),
      }),
    );

    await waitFor(() => expect(result.current.isConsolidatedReady).toBe(true));
    // USD has investment account, so it sorts first
    expect(result.current.sortedCurrencies[0]).toBe('USD');
    expect(Object.keys(result.current.accountsByCurrency)).toHaveLength(3);
  });

  it('uses CD calculation for cd-type accounts', async () => {
    const cdAccount: Account = {
      id: 'cd-1',
      name: 'CD',
      color: '#000',
      currency: 'USD',
      balance: 400,
      type: 'cd',
      principal: 1000,
      interestRate: 5,
      maturityDate: '2027-01-01',
    };

    const { result } = renderHook(() =>
      useConsolidatedTotal({
        accounts: [cdAccount],
        primaryCurrency: 'USD',
        investmentData: new Map(),
      }),
    );

    await waitFor(() => expect(result.current.isConsolidatedReady).toBe(true));
    // cdCalculationService mock returns currentValue: 500
    expect(result.current.getAccountBalance(cdAccount)).toBe(500);
    expect(result.current.consolidatedTotal).toBe(500);
  });
});
