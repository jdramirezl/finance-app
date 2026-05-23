import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import CapitalBreakdown from '../CapitalBreakdown';
import type { Account } from '../../../types';

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    formatCurrency: vi.fn((amount: number, currency: string) => {
      if (currency === 'COP') return `COP ${Math.round(amount).toLocaleString()}`;
      return `$${amount.toFixed(2)}`;
    }),
    getExchangeRate: vi.fn((from: string, to: string) => {
      if (from === 'USD' && to === 'COP') return 3830;
      if (from === 'MXN' && to === 'COP') return 210;
      return 1;
    }),
  },
}));

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Savings',
  currency: 'USD',
  balance: 1000,
  type: 'normal',
  color: '#000',
  ...overrides,
});

describe('CapitalBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows account balance in its own currency', () => {
    const accounts: Account[] = [
      makeAccount({ id: 'usd-1', name: 'US Bank', currency: 'USD', balance: 100 }),
    ];

    render(
      <CapitalBreakdown
        accounts={accounts}
        pockets={[]}
        investmentData={new Map()}
        primaryCurrency="COP"
      />
    );

    // Should show balance in account's own currency
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('groups accounts by currency', () => {
    const accounts: Account[] = [
      makeAccount({ id: 'cop-1', name: 'Local Bank', currency: 'COP', balance: 5000000 }),
    ];

    render(
      <CapitalBreakdown
        accounts={accounts}
        pockets={[]}
        investmentData={new Map()}
        primaryCurrency="COP"
      />
    );

    // Should show amount in account currency
    expect(screen.getByText('COP 5,000,000')).toBeInTheDocument();
    // Should show currency group header
    expect(screen.getByText('COP Accounts')).toBeInTheDocument();
  });

  it('renders empty state when no accounts', () => {
    render(
      <CapitalBreakdown
        accounts={[]}
        pockets={[]}
        investmentData={new Map()}
        primaryCurrency="COP"
      />
    );

    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
  });
});
