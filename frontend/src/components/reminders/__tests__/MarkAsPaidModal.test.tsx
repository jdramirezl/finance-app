import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import MarkAsPaidModal from '../MarkAsPaidModal';
import type { ReminderWithProjection } from '../../../utils/reminderProjections';
import type { Account, Movement } from '../../../types';

const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Checking',
    color: '#3B82F6',
    currency: 'USD',
    balance: 1000,
    type: 'normal',
  },
];

// Use dates inside the ±15 day window of the reminder due date below
const mockMovements: Movement[] = [
  {
    id: 'mov-1',
    type: 'EgresoNormal',
    accountId: 'acc-1',
    pocketId: 'pocket-1',
    amount: 199,
    notes: 'Netflix subscription',
    displayedDate: '2025-03-14T00:00:00.000Z',
    createdAt: '2025-03-14T00:00:00.000Z',
  },
  {
    id: 'mov-2',
    type: 'EgresoNormal',
    accountId: 'acc-1',
    pocketId: 'pocket-1',
    amount: 50,
    notes: 'Coffee shop',
    displayedDate: '2025-03-13T00:00:00.000Z',
    createdAt: '2025-03-13T00:00:00.000Z',
  },
  {
    id: 'mov-far',
    type: 'EgresoNormal',
    accountId: 'acc-1',
    pocketId: 'pocket-1',
    amount: 10,
    notes: 'Way before window',
    displayedDate: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

let movementsLoading = false;
let movementsData: Movement[] = mockMovements;

vi.mock('../../../hooks/queries', () => ({
  useMovementsQuery: () => ({
    data: movementsData,
    isLoading: movementsLoading,
  }),
  useAccountsQuery: () => ({ data: mockAccounts }),
}));

const baseReminder: ReminderWithProjection = {
  id: 'rem-1',
  userId: 'user-1',
  title: 'Netflix Subscription',
  amount: 199,
  dueDate: '2025-03-15',
  isPaid: false,
  recurrence: { type: 'monthly', interval: 1, endType: 'never' },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  reminder: baseReminder,
};

describe('MarkAsPaidModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    movementsLoading = false;
    movementsData = mockMovements;
  });

  it('returns null when reminder is null', () => {
    const { container } = render(
      <MarkAsPaidModal {...defaultProps} reminder={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('does not render anything when isOpen is false', () => {
    render(<MarkAsPaidModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Mark as Paid')).not.toBeInTheDocument();
  });

  it('renders the modal with reminder details', () => {
    render(<MarkAsPaidModal {...defaultProps} />);

    expect(
      screen.getByRole('heading', { name: 'Mark as Paid' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Netflix Subscription')).toBeInTheDocument();
    expect(screen.getByText('$199')).toBeInTheDocument();
    expect(screen.getByText(/Mar 15, 2025/)).toBeInTheDocument();
  });

  it('renders the "Just Mark as Paid" option', () => {
    render(<MarkAsPaidModal {...defaultProps} />);

    expect(screen.getByText(/option 1: complete without linking/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /just mark as paid/i }),
    ).toBeInTheDocument();
  });

  it('calls onConfirm with no movement id when "Just Mark as Paid" is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<MarkAsPaidModal {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: /just mark as paid/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith();
  });

  it('renders the link-to-existing-movement option with search input', () => {
    render(<MarkAsPaidModal {...defaultProps} />);

    expect(
      screen.getByText(/option 2: link to existing movement/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search recent movements/i),
    ).toBeInTheDocument();
  });

  it('lists movements within ±15 days of the reminder due date', () => {
    render(<MarkAsPaidModal {...defaultProps} />);

    expect(screen.getByText('Netflix subscription')).toBeInTheDocument();
    expect(screen.getByText('Coffee shop')).toBeInTheDocument();
    // "Way before window" is from 2024 — outside ±15 days of 2025-03-15
    expect(screen.queryByText('Way before window')).not.toBeInTheDocument();
  });

  it('shows loading state while movements are loading', () => {
    movementsLoading = true;
    movementsData = [];
    render(<MarkAsPaidModal {...defaultProps} />);

    expect(screen.getByText(/loading your movements/i)).toBeInTheDocument();
  });

  it('shows empty state when no movements fall within the date range', () => {
    movementsData = [
      {
        ...mockMovements[2], // far outside window
      },
    ];
    render(<MarkAsPaidModal {...defaultProps} />);

    expect(
      screen.getByText(/no movements found within ±15 days/i),
    ).toBeInTheDocument();
  });

  it('filters movements by notes when typing in the search box', async () => {
    const user = userEvent.setup();
    render(<MarkAsPaidModal {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText(/search recent movements/i),
      'netflix',
    );

    expect(screen.getByText('Netflix subscription')).toBeInTheDocument();
    expect(screen.queryByText('Coffee shop')).not.toBeInTheDocument();
  });

  it('filters movements by amount when typing in the search box', async () => {
    const user = userEvent.setup();
    render(<MarkAsPaidModal {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText(/search recent movements/i),
      '199',
    );

    expect(screen.getByText('Netflix subscription')).toBeInTheDocument();
    expect(screen.queryByText('Coffee shop')).not.toBeInTheDocument();
  });

  it('calls onConfirm with the movement id when a movement is selected', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<MarkAsPaidModal {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByText('Netflix subscription'));

    expect(onConfirm).toHaveBeenCalledWith('mov-1');
  });

  it('renders the account name beside each movement', () => {
    render(<MarkAsPaidModal {...defaultProps} />);

    // Account name appears once per matching movement (2 of them in window)
    expect(screen.getAllByText('Checking').length).toBeGreaterThan(0);
  });

  it('falls back to "Unknown Account" when account is missing', () => {
    movementsData = [
      {
        id: 'mov-orphan',
        type: 'EgresoNormal',
        accountId: 'missing-acc',
        pocketId: 'pkt',
        amount: 5,
        notes: 'Orphaned movement',
        displayedDate: '2025-03-15T00:00:00.000Z',
        createdAt: '2025-03-15T00:00:00.000Z',
      },
    ];
    render(<MarkAsPaidModal {...defaultProps} />);

    expect(screen.getByText('Unknown Account')).toBeInTheDocument();
  });

  it('calls onClose when the Cancel button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MarkAsPaidModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('shows "No description" when a movement has no notes', () => {
    movementsData = [
      {
        id: 'mov-empty',
        type: 'EgresoNormal',
        accountId: 'acc-1',
        pocketId: 'pkt',
        amount: 25,
        notes: '',
        displayedDate: '2025-03-15T00:00:00.000Z',
        createdAt: '2025-03-15T00:00:00.000Z',
      },
    ];
    render(<MarkAsPaidModal {...defaultProps} />);

    expect(screen.getByText('No description')).toBeInTheDocument();
  });
});
