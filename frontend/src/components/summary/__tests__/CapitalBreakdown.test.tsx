import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import CapitalBreakdown from '../CapitalBreakdown';
import type { Account, Pocket } from '../../../types';

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
  userId: 'user-1',
  name: 'Savings',
  currency: 'USD',
  balance: 1000,
  type: 'normal',
  color: '#000',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  ...overrides,
});

describe('CapitalBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows converted balance in primary currency for foreign accounts', () => {
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

    // Should show converted amount (100 * 3830 = 383000) formatted as COP
    expect(screen.getByText('COP 383,000')).toBeInTheDocument();
    // Should show native amount below
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('shows balance directly when account currency matches primary', () => {
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

    // Should show amount in primary currency directly
    expect(screen.getByText('COP 5,000,000')).toBeInTheDocument();
    // Should NOT show a native subtitle since no conversion needed
    const allText = screen.getByText('COP 5,000,000').closest('[class*="text-right"]');
    expect(allText?.querySelectorAll('.text-\\[10px\\]')).toHaveLength(1); // only status label
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
