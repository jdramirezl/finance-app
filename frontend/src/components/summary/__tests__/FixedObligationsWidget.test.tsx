import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import FixedObligationsWidget from '../FixedObligationsWidget';
import type { SubPocket, FixedExpenseGroup } from '../../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    formatCurrency: vi.fn((amount: number, currency: string) => `${currency} ${amount.toFixed(2)}`),
  },
}));

const makeSubPocket = (overrides: Partial<SubPocket> = {}): SubPocket => ({
  id: 'sp-1',
  pocketId: 'fixed-pocket',
  name: 'Rent',
  valueTotal: 1200,
  periodicityMonths: 1,
  balance: 600,
  enabled: true,
  ...overrides,
});

const makeGroup = (overrides: Partial<FixedExpenseGroup> = {}): FixedExpenseGroup => ({
  id: 'group-1',
  name: 'Housing',
  color: '#3b82f6',
  displayOrder: 1,
  createdAt: '2025-01-01',
  ...overrides,
});

describe('FixedObligationsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there are no sub-pockets', () => {
    const { container } = render(
      <FixedObligationsWidget subPockets={[]} groups={[]} primaryCurrency="USD" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the title and a VIEW ALL action button', () => {
    render(
      <FixedObligationsWidget
        subPockets={[makeSubPocket()]}
        groups={[]}
        primaryCurrency="USD"
      />
    );

    expect(screen.getByText('Fixed Expenses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });

  it('navigates to the budget page when VIEW ALL is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FixedObligationsWidget
        subPockets={[makeSubPocket()]}
        groups={[]}
        primaryCurrency="USD"
      />
    );

    await user.click(screen.getByRole('button', { name: /view all/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/budget');
  });

  it('renders monthly totals as the sum of contributed and target amounts', () => {
    const subPockets = [
      makeSubPocket({ id: 'sp-1', balance: 100, valueTotal: 1200, periodicityMonths: 12 }),
      makeSubPocket({ id: 'sp-2', balance: 50, valueTotal: 600, periodicityMonths: 6 }),
    ];

    render(
      <FixedObligationsWidget subPockets={subPockets} groups={[]} primaryCurrency="USD" />
    );

    // totalCurrent = 100 + 50 = 150
    // totalTarget = (1200/12) + (600/6) = 100 + 100 = 200
    expect(screen.getByText(/USD 150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/USD 200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Total/i)).toBeInTheDocument();
  });

  it('renders ungrouped sub-pockets under the "Other" header', () => {
    const subPockets = [makeSubPocket({ name: 'Internet' })];

    render(
      <FixedObligationsWidget subPockets={subPockets} groups={[]} primaryCurrency="USD" />
    );

    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
  });

  it('renders grouped sub-pockets under their group header', () => {
    const subPockets = [
      makeSubPocket({ id: 'sp-1', name: 'Rent', groupId: 'group-1' }),
      makeSubPocket({ id: 'sp-2', name: 'Utilities', groupId: 'group-1' }),
    ];
    const groups = [makeGroup()];

    render(
      <FixedObligationsWidget
        subPockets={subPockets}
        groups={groups}
        primaryCurrency="USD"
      />
    );

    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
  });

  it('renders both grouped and ungrouped sections when both exist', () => {
    const subPockets = [
      makeSubPocket({ id: 'sp-1', name: 'Rent', groupId: 'group-1' }),
      makeSubPocket({ id: 'sp-2', name: 'Netflix' }),
    ];
    const groups = [makeGroup()];

    render(
      <FixedObligationsWidget
        subPockets={subPockets}
        groups={groups}
        primaryCurrency="USD"
      />
    );

    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('marks disabled sub-pockets with an OFF badge', () => {
    const subPockets = [makeSubPocket({ name: 'Gym', enabled: false })];

    render(
      <FixedObligationsWidget subPockets={subPockets} groups={[]} primaryCurrency="USD" />
    );

    expect(screen.getByText('OFF')).toBeInTheDocument();
    expect(screen.getByText('Gym')).toBeInTheDocument();
  });

  it('skips groups that have no matching sub-pockets', () => {
    const subPockets = [makeSubPocket({ name: 'Rent', groupId: 'group-1' })];
    const groups = [
      makeGroup({ id: 'group-1', name: 'Housing', displayOrder: 1 }),
      makeGroup({ id: 'group-2', name: 'Empty Group', displayOrder: 2 }),
    ];

    render(
      <FixedObligationsWidget
        subPockets={subPockets}
        groups={groups}
        primaryCurrency="USD"
      />
    );

    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.queryByText('Empty Group')).not.toBeInTheDocument();
  });

  it('orders groups by displayOrder ascending', () => {
    const subPockets = [
      makeSubPocket({ id: 'sp-1', name: 'Rent', groupId: 'group-2' }),
      makeSubPocket({ id: 'sp-2', name: 'Spotify', groupId: 'group-1' }),
    ];
    const groups = [
      makeGroup({ id: 'group-1', name: 'Subscriptions', displayOrder: 2 }),
      makeGroup({ id: 'group-2', name: 'Housing', displayOrder: 1 }),
    ];

    render(
      <FixedObligationsWidget
        subPockets={subPockets}
        groups={groups}
        primaryCurrency="USD"
      />
    );

    const headers = screen.getAllByText(/Housing|Subscriptions/);
    // First "Housing" header should come before "Subscriptions" because displayOrder=1 < 2
    expect(headers[0]).toHaveTextContent('Housing');
    expect(headers[1]).toHaveTextContent('Subscriptions');
  });

  it('uses USD as the default primary currency when none provided', () => {
    render(
      <FixedObligationsWidget
        subPockets={[makeSubPocket({ balance: 100, valueTotal: 100, periodicityMonths: 1 })]}
        groups={[]}
      />
    );

    // Currency formatter receives "USD" since the prop default is USD
    expect(screen.getAllByText(/USD /).length).toBeGreaterThan(0);
  });
});
