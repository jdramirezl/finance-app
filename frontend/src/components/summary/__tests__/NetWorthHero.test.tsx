import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import NetWorthHero from '../NetWorthHero';
import type { NetWorthSnapshot } from '../../../services/netWorthSnapshotService';

vi.mock('../../../hooks/queries', () => ({
  useNetWorthSnapshotsQuery: vi.fn(),
}));

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    formatCurrency: vi.fn((amount: number, currency: string) => {
      // Format like "$1,234.56 USD" with a decimal point so the integer/decimal split works
      const fixed = amount.toFixed(2);
      return `$${fixed} ${currency}`;
    }),
  },
}));

import { useNetWorthSnapshotsQuery } from '../../../hooks/queries';

const mockUseNetWorthSnapshotsQuery = vi.mocked(useNetWorthSnapshotsQuery);

const makeSnapshot = (overrides: Partial<NetWorthSnapshot> = {}): NetWorthSnapshot => ({
  id: 'snap-1',
  userId: 'user-1',
  snapshotDate: '2025-01-01',
  totalNetWorth: 10000,
  baseCurrency: 'USD',
  breakdown: { USD: 10000 },
  createdAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const defaultQueryReturn = (data: NetWorthSnapshot[] = []) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
} as unknown as ReturnType<typeof useNetWorthSnapshotsQuery>);

describe('NetWorthHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNetWorthSnapshotsQuery.mockReturnValue(defaultQueryReturn());
  });

  it('renders the global net worth label and consolidated total', () => {
    render(
      <NetWorthHero
        consolidatedTotal={1234.56}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1234.56 } as Record<string, number>}
        accountCount={1}
      />
    );

    expect(screen.getByText('Global Net Worth')).toBeInTheDocument();
    // The integer part is rendered before the dot, the decimal+suffix part is rendered as opacity child
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('$1234.56 USD');
  });

  it('renders skeleton while consolidated total is not ready', () => {
    render(
      <NetWorthHero
        consolidatedTotal={0}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 0 } as Record<string, number>}
        accountCount={0}
        isConsolidatedReady={false}
      />
    );

    // No heading rendered while skeleton is visible
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    // Skeleton renders with animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('does not show percent change when fewer than two snapshots exist', () => {
    mockUseNetWorthSnapshotsQuery.mockReturnValue(
      defaultQueryReturn([makeSnapshot({ totalNetWorth: 1000 })])
    );

    render(
      <NetWorthHero
        consolidatedTotal={1500}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1500 } as Record<string, number>}
        accountCount={1}
      />
    );

    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
  });

  it('shows positive percent change against the previous snapshot', () => {
    mockUseNetWorthSnapshotsQuery.mockReturnValue(
      defaultQueryReturn([
        makeSnapshot({ id: 'cur', snapshotDate: '2025-02-01', totalNetWorth: 1500 }),
        makeSnapshot({ id: 'prev', snapshotDate: '2025-01-01', totalNetWorth: 1000 }),
      ])
    );

    render(
      <NetWorthHero
        consolidatedTotal={1500}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1500 } as Record<string, number>}
        accountCount={1}
      />
    );

    // 1500 vs 1000 = +50%
    expect(screen.getByText(/\+50\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/vs last month/)).toBeInTheDocument();
  });

  it('shows negative percent change with downward indicator', () => {
    mockUseNetWorthSnapshotsQuery.mockReturnValue(
      defaultQueryReturn([
        makeSnapshot({ id: 'cur', snapshotDate: '2025-02-01', totalNetWorth: 800 }),
        makeSnapshot({ id: 'prev', snapshotDate: '2025-01-01', totalNetWorth: 1000 }),
      ])
    );

    render(
      <NetWorthHero
        consolidatedTotal={800}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 800 } as Record<string, number>}
        accountCount={1}
      />
    );

    expect(screen.getByText(/-20\.0%/)).toBeInTheDocument();
  });

  it('does not compute percent change when previous snapshot is zero', () => {
    mockUseNetWorthSnapshotsQuery.mockReturnValue(
      defaultQueryReturn([
        makeSnapshot({ id: 'cur', snapshotDate: '2025-02-01', totalNetWorth: 1000 }),
        makeSnapshot({ id: 'prev', snapshotDate: '2025-01-01', totalNetWorth: 0 }),
      ])
    );

    render(
      <NetWorthHero
        consolidatedTotal={1000}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1000 } as Record<string, number>}
        accountCount={1}
      />
    );

    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
  });

  it('does not compute percent change when consolidated total is not ready', () => {
    mockUseNetWorthSnapshotsQuery.mockReturnValue(
      defaultQueryReturn([
        makeSnapshot({ id: 'cur', snapshotDate: '2025-02-01', totalNetWorth: 1500 }),
        makeSnapshot({ id: 'prev', snapshotDate: '2025-01-01', totalNetWorth: 1000 }),
      ])
    );

    render(
      <NetWorthHero
        consolidatedTotal={0}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 0 } as Record<string, number>}
        accountCount={1}
        isConsolidatedReady={false}
      />
    );

    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
  });

  it('renders per-currency breakdown when more than one currency has a non-zero balance', () => {
    render(
      <NetWorthHero
        consolidatedTotal={2000}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1000, MXN: 1000, COP: 0 } as Record<string, number>}
        accountCount={2}
      />
    );

    // Both USD and MXN labels should appear; COP filtered out for being 0
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('MXN')).toBeInTheDocument();
    expect(screen.queryByText('COP')).not.toBeInTheDocument();
  });

  it('does not render the per-currency breakdown when only one currency has a balance', () => {
    render(
      <NetWorthHero
        consolidatedTotal={1000}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1000 } as Record<string, number>}
        accountCount={1}
      />
    );

    // The breakdown section only appears when there are >1 entries — the inline currency
    // labels (uppercase tracking-wider pills) should not render
    const usdPill = screen.queryAllByText('USD');
    // Only the formatted currency string contains "USD"; the standalone pill label is absent
    expect(usdPill.length).toBe(0);
  });
});
