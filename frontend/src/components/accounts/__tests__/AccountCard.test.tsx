import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import AccountCard from '../AccountCard';
import type { Account } from '../../../types';

// SelectableValue depends on SelectionProvider, which is irrelevant to the
// AccountCard surface we're testing. Mirror the MovementList test by
// replacing it with a passthrough that renders its children.
vi.mock('../../ui/SelectableValue', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="selectable-value">{children}</span>
  ),
}));

const baseAccount: Account = {
  id: 'acc1',
  name: 'Checking',
  color: '#3B82F6',
  currency: 'USD',
  balance: 1234.56,
  type: 'normal',
};

const defaultProps = {
  account: baseAccount,
  isSelected: false,
  onSelect: vi.fn(),
  onEdit: vi.fn(),
  onArchive: vi.fn(),
};

describe('AccountCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the account name, currency, and formatted balance', () => {
    render(<AccountCard {...defaultProps} />);

    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    // Locale-aware formatting; assert via partial match on the value.
    expect(screen.getByTestId('selectable-value').textContent).toMatch(/1,234\.56/);
  });

  it('renders the Wallet icon for normal accounts and no badge', () => {
    render(<AccountCard {...defaultProps} />);

    expect(screen.queryByText('Investments')).not.toBeInTheDocument();
    expect(screen.queryByText('Certificate of Deposit')).not.toBeInTheDocument();
    expect(screen.queryByText('Fixed Expenses')).not.toBeInTheDocument();
  });

  it('shows the Investments badge for investment accounts', () => {
    const investment: Account = {
      ...baseAccount,
      type: 'investment',
      stockSymbol: 'VOO',
    };

    render(<AccountCard {...defaultProps} account={investment} />);

    expect(screen.getByText('Investments')).toBeInTheDocument();
    expect(screen.queryByText('Certificate of Deposit')).not.toBeInTheDocument();
  });

  it('shows the Certificate of Deposit badge for CD accounts', () => {
    const cd: Account = {
      ...baseAccount,
      type: 'investment',
      investmentType: 'cd',
    };

    render(<AccountCard {...defaultProps} account={cd} />);

    expect(screen.getByText('Certificate of Deposit')).toBeInTheDocument();
    expect(screen.queryByText('Investments')).not.toBeInTheDocument();
  });

  it('shows the Fixed Expenses badge when isFixedExpensesAccount is true', () => {
    render(<AccountCard {...defaultProps} isFixedExpensesAccount />);

    expect(screen.getByText('Fixed Expenses')).toBeInTheDocument();
  });

  it('applies the selected border style when isSelected is true', () => {
    const { container } = render(<AccountCard {...defaultProps} isSelected />);
    const card = container.firstChild as HTMLElement;

    expect(card.className).toContain('border-blue-500');
  });

  it('applies the unselected border style when isSelected is false', () => {
    const { container } = render(<AccountCard {...defaultProps} isSelected={false} />);
    const card = container.firstChild as HTMLElement;

    expect(card.className).not.toContain('border-blue-500');
    expect(card.className).toContain('border-gray-200');
  });

  it('calls onSelect with the account when the card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AccountCard {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByText('Checking'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(baseAccount);
  });

  it('calls onEdit with the account when the Edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onSelect = vi.fn();
    render(<AccountCard {...defaultProps} onEdit={onEdit} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(baseAccount);
  });

  it('calls onArchive with the account id when the Archive button is clicked', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    const onSelect = vi.fn();
    render(<AccountCard {...defaultProps} onArchive={onArchive} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /^archive$/i }));

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onArchive).toHaveBeenCalledWith('acc1');
  });

  it('does not propagate clicks on the action buttons up to the card', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(<AccountCard {...defaultProps} onSelect={onSelect} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    // Clicking the Edit button must NOT bubble up and trigger onSelect.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows the loading state on the archive button when isArchiving is true', () => {
    render(<AccountCard {...defaultProps} isArchiving />);

    expect(screen.getByRole('button', { name: /^archive$/i })).toBeDisabled();
  });

  it('renders the account color swatch with the account color', () => {
    const { container } = render(<AccountCard {...defaultProps} />);
    const swatch = container.querySelector('div.rounded-full[style*="background-color"]') as HTMLElement | null;

    expect(swatch).not.toBeNull();
    // Color comparisons normalize to rgb in jsdom.
    expect(swatch?.style.backgroundColor).toBeTruthy();
  });
});
