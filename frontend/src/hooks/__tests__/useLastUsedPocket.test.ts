import { describe, it, expect, beforeEach } from 'vitest';
import { resolveLastUsedPocket, useLastUsedPocket } from '../../store/useLastUsedPocket';
import type { Account, Pocket, Settings } from '../../types';

const accounts: Account[] = [
  { id: 'acc1', name: 'Checking', color: '#000', currency: 'USD', balance: 100 },
  { id: 'acc2', name: 'Savings', color: '#111', currency: 'USD', balance: 200 },
];

const pockets: Pocket[] = [
  { id: 'pkt1', accountId: 'acc1', name: 'Main', type: 'normal', balance: 100, currency: 'USD' },
  { id: 'pkt2', accountId: 'acc2', name: 'Reserve', type: 'normal', balance: 200, currency: 'USD' },
];

const settingsWithDefaults: Settings = {
  primaryCurrency: 'USD',
  defaultExpenseAccountId: 'acc2',
  defaultExpensePocketId: 'pkt2',
  defaultIncomeAccountId: 'acc2',
  defaultIncomePocketId: 'pkt2',
  dateFormat: 'MMM d, yyyy',
  movementsPerPage: 25,
  reminderAdvanceDays: 3,
  defaultCurrencyForNewAccounts: 'USD',
};

describe('resolveLastUsedPocket', () => {
  beforeEach(() => {
    // Clear store state and persisted data
    useLastUsedPocket.setState({ expense: null, income: null, lastType: null });
    localStorage.clear();
  });

  it('returns last-used when valid (highest priority)', () => {
    useLastUsedPocket.getState().setLastUsed('expense', 'acc1', 'pkt1');

    const result = resolveLastUsedPocket('expense', accounts, pockets, settingsWithDefaults);

    expect(result).toEqual({ accountId: 'acc1', pocketId: 'pkt1', lastType: 'EgresoNormal' });
  });

  it('falls back to DB default when no last-used exists', () => {
    const result = resolveLastUsedPocket('expense', accounts, pockets, settingsWithDefaults);

    expect(result).toEqual({ accountId: 'acc2', pocketId: 'pkt2', lastType: 'EgresoNormal' });
  });

  it('falls back to DB default when last-used references deleted account', () => {
    useLastUsedPocket.getState().setLastUsed('expense', 'deleted-acc', 'deleted-pkt');

    const result = resolveLastUsedPocket('expense', accounts, pockets, settingsWithDefaults);

    expect(result).toEqual({ accountId: 'acc2', pocketId: 'pkt2', lastType: 'EgresoNormal' });
  });

  it('falls back to first account when no settings provided', () => {
    const result = resolveLastUsedPocket('expense', accounts, pockets);

    expect(result).toEqual({ accountId: 'acc1', pocketId: 'pkt1', lastType: 'EgresoNormal' });
  });

  it('falls back to first account when DB default references deleted account', () => {
    const badSettings: Settings = {
      primaryCurrency: 'USD',
      defaultExpenseAccountId: 'deleted-acc',
      defaultExpensePocketId: 'deleted-pkt',
      dateFormat: 'MMM d, yyyy',
      movementsPerPage: 25,
      reminderAdvanceDays: 3,
      defaultCurrencyForNewAccounts: 'USD',
    };

    const result = resolveLastUsedPocket('expense', accounts, pockets, badSettings);

    expect(result).toEqual({ accountId: 'acc1', pocketId: 'pkt1', lastType: 'EgresoNormal' });
  });

  it('returns null when no accounts exist', () => {
    const result = resolveLastUsedPocket('expense', [], [], settingsWithDefaults);

    expect(result).toBeNull();
  });

  it('uses income defaults for income type', () => {
    const settings: Settings = {
      primaryCurrency: 'USD',
      defaultExpenseAccountId: 'acc1',
      defaultExpensePocketId: 'pkt1',
      defaultIncomeAccountId: 'acc2',
      defaultIncomePocketId: 'pkt2',
      dateFormat: 'MMM d, yyyy',
      movementsPerPage: 25,
      reminderAdvanceDays: 3,
      defaultCurrencyForNewAccounts: 'USD',
    };

    const result = resolveLastUsedPocket('income', accounts, pockets, settings);

    expect(result).toEqual({ accountId: 'acc2', pocketId: 'pkt2', lastType: 'EgresoNormal' });
  });
});

describe('useLastUsedPocket lastType', () => {
  beforeEach(() => {
    useLastUsedPocket.setState({ expense: null, income: null, lastType: null });
    localStorage.clear();
  });

  it('stores the movement type when provided to setLastUsed', () => {
    useLastUsedPocket.getState().setLastUsed('income', 'acc1', 'pkt1', 'IngresoFijo');

    expect(useLastUsedPocket.getState().getLastType()).toBe('IngresoFijo');
  });

  it('does not change lastType when movementType is omitted', () => {
    useLastUsedPocket.getState().setLastUsed('expense', 'acc1', 'pkt1', 'EgresoFijo');
    useLastUsedPocket.getState().setLastUsed('expense', 'acc2', 'pkt2');

    expect(useLastUsedPocket.getState().getLastType()).toBe('EgresoFijo');
  });

  it('persists lastType to localStorage under the same key', () => {
    useLastUsedPocket.getState().setLastUsed('expense', 'acc1', 'pkt1', 'EgresoFijo');

    const raw = localStorage.getItem('finance-app-last-used-pocket');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.lastType).toBe('EgresoFijo');
    expect(parsed.expense).toEqual({ accountId: 'acc1', pocketId: 'pkt1' });
  });

  it('resolveLastUsedPocket returns the stored lastType', () => {
    useLastUsedPocket.getState().setLastUsed('income', 'acc1', 'pkt1', 'IngresoFijo');

    const result = resolveLastUsedPocket('income', accounts, pockets);

    expect(result).toEqual({ accountId: 'acc1', pocketId: 'pkt1', lastType: 'IngresoFijo' });
  });

  it('resolveLastUsedPocket defaults lastType to EgresoNormal when nothing is stored', () => {
    const result = resolveLastUsedPocket('expense', accounts, pockets);

    expect(result?.lastType).toBe('EgresoNormal');
  });
});
