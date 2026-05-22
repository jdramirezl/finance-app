import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import BudgetDistribution from '../BudgetDistribution';
import type { DistributionEntry } from '../BudgetEntryRow';
import type { Account, Pocket } from '../../../types';

const toastWarning = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastInfo = vi.fn();

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    warning: toastWarning,
    success: toastSuccess,
    error: toastError,
    info: toastInfo,
  }),
}));

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'Checking', color: '#000', currency: 'USD', balance: 1000, type: 'normal' },
];

const mockPockets: Pocket[] = [
  { id: 'pkt1', accountId: 'acc1', name: 'Daily', type: 'normal', balance: 500, currency: 'USD' },
  { id: 'pkt2', accountId: 'acc1', name: 'Travel', type: 'normal', balance: 200, currency: 'USD' },
];

const baseProps = {
  remaining: 1000,
  currency: 'USD',
  primaryCurrency: 'USD',
  showConversion: false,
  convertedAmounts: new Map<string, number>(),
  onEntriesChange: vi.fn(),
  pockets: mockPockets,
  accounts: mockAccounts,
};

describe('BudgetDistribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty state when there are no entries', () => {
    render(<BudgetDistribution {...baseProps} entries={[]} />);

    expect(screen.getByText('No distribution entries yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Add an entry to start planning how to allocate your remaining budget/i),
    ).toBeInTheDocument();
  });

  it('shows the Distribution title and Add Entry button when no entries', () => {
    render(<BudgetDistribution {...baseProps} entries={[]} />);

    expect(screen.getByText('Distribution')).toBeInTheDocument();
    // Both header and empty-state CTA show "Add Entry"
    expect(screen.getAllByRole('button', { name: /Add Entry/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('clicking the header Add Entry adds a new entry via onEntriesChange', async () => {
    const user = userEvent.setup();
    const onEntriesChange = vi.fn();

    render(
      <BudgetDistribution {...baseProps} entries={[]} onEntriesChange={onEntriesChange} />,
    );

    // Pick the header button (the one in the empty-state Card also calls Add Entry)
    const buttons = screen.getAllByRole('button', { name: /Add Entry/i });
    await user.click(buttons[0]);

    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    const newEntries = onEntriesChange.mock.calls[0][0] as DistributionEntry[];
    expect(newEntries).toHaveLength(1);
    expect(newEntries[0]).toMatchObject({ name: '', percentage: 0 });
    expect(newEntries[0].id).toEqual(expect.any(String));
  });

  it('renders existing entries with their percentages', () => {
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'Savings', percentage: 30 },
      { id: 'e2', name: 'Investments', percentage: 40 },
    ];

    render(<BudgetDistribution {...baseProps} entries={entries} />);

    expect(screen.getByText('Savings')).toBeInTheDocument();
    expect(screen.getByText('Investments')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('shows an over-100% warning when total percentage exceeds 100', () => {
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'A', percentage: 70 },
      { id: 'e2', name: 'B', percentage: 50 },
    ];

    render(<BudgetDistribution {...baseProps} entries={entries} />);

    expect(screen.getByText(/Total percentage: 120\.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/exceeds 100%/i)).toBeInTheDocument();
  });

  it('shows an unallocated warning when total percentage is below 100', () => {
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'A', percentage: 30 },
      { id: 'e2', name: 'B', percentage: 20 },
    ];

    render(<BudgetDistribution {...baseProps} entries={entries} />);

    expect(screen.getByText(/Total percentage: 50\.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/50\.0% unallocated/i)).toBeInTheDocument();
  });

  it('omits the percentage warning banner when the total is exactly 100', () => {
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'A', percentage: 60 },
      { id: 'e2', name: 'B', percentage: 40 },
    ];

    render(<BudgetDistribution {...baseProps} entries={entries} />);

    expect(screen.queryByText(/Total percentage:/i)).not.toBeInTheDocument();
  });

  it('clicking Edit on a row enters edit mode with name and percentage inputs', async () => {
    const user = userEvent.setup();
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'Savings', percentage: 25 },
    ];

    render(<BudgetDistribution {...baseProps} entries={entries} />);

    await user.click(screen.getByTitle('Edit'));

    expect(screen.getByPlaceholderText('Entry name')).toHaveValue('Savings');
    expect(screen.getByPlaceholderText('%')).toHaveValue(25);
  });

  it('clicking Save with an empty name shows a warning toast and skips onEntriesChange', async () => {
    const user = userEvent.setup();
    const onEntriesChange = vi.fn();
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'Savings', percentage: 25 },
    ];

    render(
      <BudgetDistribution {...baseProps} entries={entries} onEntriesChange={onEntriesChange} />,
    );

    await user.click(screen.getByTitle('Edit'));
    await user.clear(screen.getByPlaceholderText('Entry name'));
    await user.click(screen.getByTitle('Save'));

    expect(toastWarning).toHaveBeenCalledWith('Please enter a name for this entry');
    expect(onEntriesChange).not.toHaveBeenCalled();
  });

  it('saves edits via onEntriesChange when name and percentage are valid', async () => {
    const user = userEvent.setup();
    const onEntriesChange = vi.fn();
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'Savings', percentage: 25 },
    ];

    render(
      <BudgetDistribution {...baseProps} entries={entries} onEntriesChange={onEntriesChange} />,
    );

    await user.click(screen.getByTitle('Edit'));

    const nameInput = screen.getByPlaceholderText('Entry name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Investments');

    const pctInput = screen.getByPlaceholderText('%');
    await user.clear(pctInput);
    await user.type(pctInput, '50');

    await user.click(screen.getByTitle('Save'));

    expect(toastWarning).not.toHaveBeenCalled();
    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    const updated = onEntriesChange.mock.calls[0][0] as DistributionEntry[];
    expect(updated[0]).toMatchObject({ id: 'e1', name: 'Investments', percentage: 50 });
  });

  it('clicking Delete removes the entry from onEntriesChange', async () => {
    const user = userEvent.setup();
    const onEntriesChange = vi.fn();
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'Savings', percentage: 25 },
      { id: 'e2', name: 'Travel', percentage: 50 },
    ];

    render(
      <BudgetDistribution {...baseProps} entries={entries} onEntriesChange={onEntriesChange} />,
    );

    const deleteButtons = screen.getAllByTitle('Delete');
    await user.click(deleteButtons[0]);

    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    const remaining = onEntriesChange.mock.calls[0][0] as DistributionEntry[];
    expect(remaining).toEqual([{ id: 'e2', name: 'Travel', percentage: 50 }]);
  });

  it('renders the donut chart legend for entries with non-zero percentage', () => {
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'Savings', percentage: 30 },
      { id: 'e2', name: 'Empty', percentage: 0 },
    ];

    render(<BudgetDistribution {...baseProps} entries={entries} />);

    // Legend appears once for non-zero entries; zero entries are filtered out
    expect(screen.getByText(/Savings \(30%\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Empty \(0%\)/)).not.toBeInTheDocument();
  });

  it('shows the converted-amount column header when showConversion is true', () => {
    render(
      <BudgetDistribution
        {...baseProps}
        entries={[{ id: 'e1', name: 'Savings', percentage: 25 }]}
        showConversion
        primaryCurrency="MXN"
      />,
    );

    // Header reads "Amount (USD)" for source and "Amount (MXN)" for converted
    expect(screen.getByText('Amount (USD)')).toBeInTheDocument();
    expect(screen.getByText('Amount (MXN)')).toBeInTheDocument();
  });

  it('renders zero amount placeholders when remaining is 0', () => {
    const entries: DistributionEntry[] = [
      { id: 'e1', name: 'Savings', percentage: 25 },
    ];

    const { container } = render(
      <BudgetDistribution {...baseProps} entries={entries} remaining={0} />,
    );

    // The amount cell should show $0.00 because remaining is 0
    expect(within(container).getByText(/^\$0\.00$/)).toBeInTheDocument();
  });
});
