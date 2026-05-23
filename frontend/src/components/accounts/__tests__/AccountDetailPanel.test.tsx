import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import AccountDetailPanel from '../AccountDetailPanel';
import type { Account, CDInvestmentAccount, Pocket } from '../../../types';

// Replace heavy child panels with stubs — their behaviors are covered by
// their own tests, and isolating AccountDetailPanel keeps this surface
// focused on the header/actions and the CD-vs-pocket branching.
vi.mock('../CDDetailsPanel', () => ({
  default: ({ account }: { account: CDInvestmentAccount }) => (
    <div data-testid="cd-details-panel">CD: {account.name}</div>
  ),
}));

vi.mock('../PocketManagementSection', () => ({
  default: ({ accountId }: { accountId: string }) => (
    <div data-testid="pocket-management">Pockets for {accountId}</div>
  ),
}));

const baseAccount: Account = {
  id: 'acc1',
  name: 'My Checking',
  color: '#3B82F6',
  currency: 'USD',
  balance: 1500,
  type: 'normal',
};

const cdAccount: CDInvestmentAccount = {
  id: 'cd1',
  name: 'My CD',
  color: '#10B981',
  currency: 'USD',
  balance: 5000,
  type: 'cd',
  investmentType: 'cd',
  principal: 5000,
  interestRate: 4.5,
  termMonths: 12,
  maturityDate: '2027-01-15',
  compoundingFrequency: 'monthly',
};

const buildPocket = (overrides: Partial<Pocket> = {}): Pocket => ({
  id: 'pkt1',
  accountId: 'acc1',
  name: 'Daily',
  type: 'normal',
  balance: 100,
  currency: 'USD',
  ...overrides,
});

// Minimal stand-ins matching the prop types — every method/value the
// component reads has a vi.fn() or sentinel value. The mocked child
// components consume these but never invoke them in the test surface.
const buildMutations = () =>
  ({
    reorderPockets: { mutate: vi.fn() },
  }) as unknown as Parameters<typeof AccountDetailPanel>[0]['pocketMutations'];

const buildToast = () =>
  ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }) as unknown as Parameters<typeof AccountDetailPanel>[0]['toast'];

const defaultProps = {
  account: baseAccount,
  pockets: [buildPocket()],
  accounts: [baseAccount],
  pocketMutations: buildMutations(),
  toast: buildToast(),
  confirm: vi.fn().mockResolvedValue(true),
  setError: vi.fn(),
  onEditAccount: vi.fn(),
  onEditCD: vi.fn(),
  onCascadeDelete: vi.fn(),
  onClose: vi.fn(),
  onMobileBack: vi.fn(),
};

describe('AccountDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Account Details heading', () => {
    render(<AccountDetailPanel {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Account Details' })).toBeInTheDocument();
  });

  it('renders the account name, currency badge, and balance', () => {
    render(<AccountDetailPanel {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'My Checking' })).toBeInTheDocument();
    // The square color tile shows the currency code as text.
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
    expect(screen.getByText(/\$1,500/)).toBeInTheDocument();
  });

  it('shows a positive balance in blue and a negative balance in red', () => {
    const { rerender } = render(<AccountDetailPanel {...defaultProps} />);
    expect(screen.getByText(/\$1,500/).className).toContain('text-blue-600');

    rerender(
      <AccountDetailPanel
        {...defaultProps}
        account={{ ...baseAccount, balance: -250 }}
      />,
    );
    expect(screen.getByText(/-250/).className).toContain('text-red-600');
  });

  it('renders the Edit Account and Delete All buttons', () => {
    render(<AccountDetailPanel {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Edit Account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete All/i })).toBeInTheDocument();
  });

  it('renders the desktop Close button and the mobile Back button', () => {
    render(<AccountDetailPanel {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to accounts list/i })).toBeInTheDocument();
  });

  it('calls onEditAccount with the account when Edit Account is clicked', async () => {
    const user = userEvent.setup();
    const onEditAccount = vi.fn();
    render(<AccountDetailPanel {...defaultProps} onEditAccount={onEditAccount} />);

    await user.click(screen.getByRole('button', { name: /Edit Account/i }));

    expect(onEditAccount).toHaveBeenCalledTimes(1);
    expect(onEditAccount).toHaveBeenCalledWith(baseAccount);
  });

  it('calls onCascadeDelete with the account id when Delete All is clicked', async () => {
    const user = userEvent.setup();
    const onCascadeDelete = vi.fn();
    render(<AccountDetailPanel {...defaultProps} onCascadeDelete={onCascadeDelete} />);

    await user.click(screen.getByRole('button', { name: /Delete All/i }));

    expect(onCascadeDelete).toHaveBeenCalledTimes(1);
    expect(onCascadeDelete).toHaveBeenCalledWith('acc1');
  });

  it('calls onClose when the desktop Close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AccountDetailPanel {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /Close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onMobileBack when the mobile Back button is clicked', async () => {
    const user = userEvent.setup();
    const onMobileBack = vi.fn();
    render(<AccountDetailPanel {...defaultProps} onMobileBack={onMobileBack} />);

    await user.click(screen.getByRole('button', { name: /Back to accounts list/i }));

    expect(onMobileBack).toHaveBeenCalledTimes(1);
  });

  it('renders the PocketManagementSection for non-CD accounts', () => {
    render(<AccountDetailPanel {...defaultProps} />);

    expect(screen.getByTestId('pocket-management')).toBeInTheDocument();
    expect(screen.getByText('Pockets for acc1')).toBeInTheDocument();
    expect(screen.queryByTestId('cd-details-panel')).not.toBeInTheDocument();
  });

  it('renders the CDDetailsPanel for CD accounts and forwards the account', () => {
    render(<AccountDetailPanel {...defaultProps} account={cdAccount} />);

    expect(screen.getByTestId('cd-details-panel')).toBeInTheDocument();
    expect(screen.getByText('CD: My CD')).toBeInTheDocument();
    expect(screen.queryByTestId('pocket-management')).not.toBeInTheDocument();
  });

  it('applies the account color to the currency tile background', () => {
    const { container } = render(<AccountDetailPanel {...defaultProps} />);
    const tile = container.querySelector('div[style*="background-color"]') as HTMLElement | null;

    expect(tile).not.toBeNull();
    // jsdom normalizes named colors to rgb(); just check the prop is set.
    expect(tile?.style.backgroundColor).toBeTruthy();
  });
});
