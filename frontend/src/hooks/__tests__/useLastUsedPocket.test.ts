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
};

describe('resolveLastUsedPocket', () => {
  beforeEach(() => {
    // Clear localStorage state
    useLastUsedPocket.setState({ expense: null, income: null });
  });

  it('returns last-used when valid (highest priority)', () => {
    useLastUsedPocket.getState().setLastUsed('expense', 'acc1', 'pkt1');

    const result = resolveLastUsedPocket('expense', accounts, pockets, settingsWithDefaults);

    expect(result).toEqual({ accountId: 'acc1', pocketId: 'pkt1' });
  });

  it('falls back to DB default when no last-used exists', () => {
    const result = resolveLastUsedPocket('expense', accounts, pockets, settingsWithDefaults);

    expect(result).toEqual({ accountId: 'acc2', pocketId: 'pkt2' });
  });

  it('falls back to DB default when last-used references deleted account', () => {
    useLastUsedPocket.getState().setLastUsed('expense', 'deleted-acc', 'deleted-pkt');

    const result = resolveLastUsedPocket('expense', accounts, pockets, settingsWithDefaults);

    expect(result).toEqual({ accountId: 'acc2', pocketId: 'pkt2' });
  });

  it('falls back to first account when no settings provided', () => {
    const result = resolveLastUsedPocket('expense', accounts, pockets);

    expect(result).toEqual({ accountId: 'acc1', pocketId: 'pkt1' });
  });

  it('falls back to first account when DB default references deleted account', () => {
    const badSettings: Settings = {
      primaryCurrency: 'USD',
      defaultExpenseAccountId: 'deleted-acc',
      defaultExpensePocketId: 'deleted-pkt',
    };

    const result = resolveLastUsedPocket('expense', accounts, pockets, badSettings);

    expect(result).toEqual({ accountId: 'acc1', pocketId: 'pkt1' });
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
    };

    const result = resolveLastUsedPocket('income', accounts, pockets, settings);

    expect(result).toEqual({ accountId: 'acc2', pocketId: 'pkt2' });
  });
});
