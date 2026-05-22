import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import OrphanedMovementsPanel, {
  type OrphanedMovementsPanelProps,
} from '../OrphanedMovementsPanel';
import type { Movement } from '../../../types';

const buildMovement = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'm1',
  type: 'EgresoNormal',
  accountId: 'orphan-account',
  pocketId: 'orphan-pocket',
  amount: 100,
  notes: '',
  displayedDate: '2026-01-15T00:00:00.000Z',
  createdAt: '2026-01-15T00:00:00.000Z',
  isPending: false,
  isOrphaned: true,
  orphanedAccountName: 'Old Checking',
  orphanedAccountCurrency: 'USD',
  orphanedPocketName: 'Daily',
  ...overrides,
});

const buildProps = (
  overrides: Partial<OrphanedMovementsPanelProps> = {},
): OrphanedMovementsPanelProps => ({
  isOpen: true,
  orphanedMovements: [],
  onClose: vi.fn(),
  onRestoreClick: vi.fn(),
  ...overrides,
});

describe('OrphanedMovementsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <OrphanedMovementsPanel {...buildProps({ isOpen: false })} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the panel header and close button when open', () => {
    render(<OrphanedMovementsPanel {...buildProps()} />);

    expect(
      screen.getByRole('heading', { name: /orphaned movements/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /close/i }),
    ).toBeInTheDocument();
  });

  it('renders the empty state when there are no orphaned movements', () => {
    render(<OrphanedMovementsPanel {...buildProps()} />);

    expect(
      screen.getByText(/no orphaned movements found/i),
    ).toBeInTheDocument();
  });

  it('groups movements by orphaned account name and currency', () => {
    const movements: Movement[] = [
      buildMovement({
        id: 'm1',
        orphanedAccountName: 'Old Checking',
        orphanedAccountCurrency: 'USD',
      }),
      buildMovement({
        id: 'm2',
        orphanedAccountName: 'Old Checking',
        orphanedAccountCurrency: 'USD',
      }),
      buildMovement({
        id: 'm3',
        orphanedAccountName: 'Old Savings',
        orphanedAccountCurrency: 'EUR',
      }),
    ];

    render(
      <OrphanedMovementsPanel
        {...buildProps({ orphanedMovements: movements })}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Old Checking (USD)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Old Savings (EUR)' }),
    ).toBeInTheDocument();
  });

  it('treats different currencies of the same account name as separate groups', () => {
    const movements: Movement[] = [
      buildMovement({
        id: 'm1',
        orphanedAccountName: 'Wallet',
        orphanedAccountCurrency: 'USD',
      }),
      buildMovement({
        id: 'm2',
        orphanedAccountName: 'Wallet',
        orphanedAccountCurrency: 'MXN',
      }),
    ];

    render(
      <OrphanedMovementsPanel
        {...buildProps({ orphanedMovements: movements })}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Wallet (USD)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Wallet (MXN)' }),
    ).toBeInTheDocument();
  });

  it('renders the per-group movement count and total amount', () => {
    const movements: Movement[] = [
      buildMovement({
        id: 'm1',
        type: 'IngresoNormal',
        amount: 200,
      }),
      buildMovement({
        id: 'm2',
        type: 'EgresoNormal',
        amount: 50,
      }),
    ];

    render(
      <OrphanedMovementsPanel
        {...buildProps({ orphanedMovements: movements })}
      />,
    );

    // 200 (income) - 50 (expense) = 150.00 across 2 movements
    expect(
      screen.getByText(/2 movement\(s\) • Total: \$150\.00/i),
    ).toBeInTheDocument();
  });

  it('treats Ingreso movements as positive and Egreso movements as negative in the total', () => {
    const movements: Movement[] = [
      buildMovement({ id: 'm1', type: 'EgresoNormal', amount: 75 }),
      buildMovement({ id: 'm2', type: 'EgresoFijo', amount: 25 }),
    ];

    render(
      <OrphanedMovementsPanel
        {...buildProps({ orphanedMovements: movements })}
      />,
    );

    // -75 -25 = -100.00
    expect(
      screen.getByText(/2 movement\(s\) • Total: \$-100\.00/i),
    ).toBeInTheDocument();
  });

  it('invokes onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<OrphanedMovementsPanel {...buildProps({ onClose })} />);

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onRestoreClick with all movement ids and the source label for the group', async () => {
    const user = userEvent.setup();
    const onRestoreClick = vi.fn();

    const movements: Movement[] = [
      buildMovement({
        id: 'm1',
        orphanedAccountName: 'Old Checking',
        orphanedAccountCurrency: 'USD',
      }),
      buildMovement({
        id: 'm2',
        orphanedAccountName: 'Old Checking',
        orphanedAccountCurrency: 'USD',
      }),
    ];

    render(
      <OrphanedMovementsPanel
        {...buildProps({ orphanedMovements: movements, onRestoreClick })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^restore$/i }));

    expect(onRestoreClick).toHaveBeenCalledTimes(1);
    expect(onRestoreClick).toHaveBeenCalledWith({
      movementIds: ['m1', 'm2'],
      sourceLabel: 'Old Checking (USD)',
    });
  });

  it('renders one Restore button per group', () => {
    const movements: Movement[] = [
      buildMovement({
        id: 'm1',
        orphanedAccountName: 'A',
        orphanedAccountCurrency: 'USD',
      }),
      buildMovement({
        id: 'm2',
        orphanedAccountName: 'B',
        orphanedAccountCurrency: 'USD',
      }),
      buildMovement({
        id: 'm3',
        orphanedAccountName: 'C',
        orphanedAccountCurrency: 'USD',
      }),
    ];

    render(
      <OrphanedMovementsPanel
        {...buildProps({ orphanedMovements: movements })}
      />,
    );

    expect(
      screen.getAllByRole('button', { name: /^restore$/i }),
    ).toHaveLength(3);
  });
});
