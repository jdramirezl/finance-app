import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import AccountPocketSelector from '../AccountPocketSelector';

const mockAccounts = [
  { id: 'acc1', name: 'Checking', color: '#000', currency: 'USD', balance: 1000, type: 'normal' as const },
  { id: 'acc2', name: 'Savings', color: '#111', currency: 'MXN', balance: 5000, type: 'normal' as const },
  { id: 'acc3', name: 'NoFixed', color: '#222', currency: 'USD', balance: 200, type: 'normal' as const },
];

const mockPockets = [
  { id: 'pkt1', name: 'Daily', accountId: 'acc1', balance: 500, type: 'normal' as const, currency: 'USD' as const },
  { id: 'pkt1f', name: 'Fixed Pocket', accountId: 'acc1', balance: 200, type: 'fixed' as const, currency: 'USD' as const },
  { id: 'pkt2', name: 'Reserve', accountId: 'acc2', balance: 3000, type: 'normal' as const, currency: 'MXN' as const },
  { id: 'pkt2f', name: 'Fixed Reserve', accountId: 'acc2', balance: 100, type: 'fixed' as const, currency: 'MXN' as const },
  { id: 'pkt3', name: 'NoFixedDaily', accountId: 'acc3', balance: 100, type: 'normal' as const, currency: 'USD' as const },
];

const mockSubPockets = [
  { id: 'sp1', pocketId: 'pkt1f', name: 'Internet', valueTotal: 1200, periodicityMonths: 12, balance: 0, enabled: true },
  { id: 'sp2', pocketId: 'pkt1f', name: 'Insurance', valueTotal: 2400, periodicityMonths: 12, balance: 0, enabled: true },
];

vi.mock('../../../hooks/queries', () => ({
  useAccountsQuery: () => ({ data: mockAccounts }),
  usePocketsQuery: () => ({ data: mockPockets }),
  useSubPocketsQuery: () => ({ data: mockSubPockets }),
}));

describe('AccountPocketSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Account and Pocket selects with placeholder options', () => {
    render(
      <AccountPocketSelector
        accountId=""
        pocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Account/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pocket/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Select Account' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Select Pocket' })).toBeInTheDocument();
  });

  it('disables Pocket select when no account is selected', () => {
    render(
      <AccountPocketSelector
        accountId=""
        pocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Pocket/)).toBeDisabled();
  });

  it('lists every account by default and respects showAccountCurrency', () => {
    const { rerender } = render(
      <AccountPocketSelector
        accountId=""
        pocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('option', { name: 'Checking' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Savings' })).toBeInTheDocument();

    rerender(
      <AccountPocketSelector
        accountId=""
        pocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        showAccountCurrency
      />,
    );

    expect(screen.getByRole('option', { name: 'Checking (USD)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Savings (MXN)' })).toBeInTheDocument();
  });

  it('changing account fires onAccountChange and clears existing pocket/sub-pocket', async () => {
    const user = userEvent.setup();
    const onAccountChange = vi.fn();
    const onPocketChange = vi.fn();
    const onSubPocketChange = vi.fn();

    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1"
        subPocketId="sp1"
        onAccountChange={onAccountChange}
        onPocketChange={onPocketChange}
        onSubPocketChange={onSubPocketChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Account/), 'acc2');

    expect(onAccountChange).toHaveBeenCalledWith('acc2');
    expect(onPocketChange).toHaveBeenCalledWith('');
    expect(onSubPocketChange).toHaveBeenCalledWith('');
  });

  it('changing pocket fires onPocketChange and clears existing sub-pocket', async () => {
    const user = userEvent.setup();
    const onPocketChange = vi.fn();
    const onSubPocketChange = vi.fn();

    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1"
        subPocketId="sp1"
        onAccountChange={vi.fn()}
        onPocketChange={onPocketChange}
        onSubPocketChange={onSubPocketChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Pocket/), 'pkt1f');

    expect(onPocketChange).toHaveBeenCalledWith('pkt1f');
    expect(onSubPocketChange).toHaveBeenCalledWith('');
  });

  it('limits the account list to accounts with a fixed pocket when smart mode is on for fixed types', () => {
    render(
      <AccountPocketSelector
        accountId=""
        pocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        movementType="EgresoFijo"
        enforceMovementType
      />,
    );

    expect(screen.getByRole('option', { name: 'Checking' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Savings' })).toBeInTheDocument();
    // acc3 has no fixed pocket, so it should not show up
    expect(screen.queryByRole('option', { name: 'NoFixed' })).not.toBeInTheDocument();
  });

  it('lists only fixed pockets for fixed movement types in smart mode', () => {
    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1f"
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        movementType="EgresoFijo"
        enforceMovementType
      />,
    );

    expect(screen.getByRole('option', { name: 'Fixed Pocket' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Daily' })).not.toBeInTheDocument();
  });

  it('lists only non-fixed pockets for non-fixed movement types in smart mode', () => {
    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        movementType="EgresoNormal"
        enforceMovementType
      />,
    );

    expect(screen.getByRole('option', { name: 'Daily' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Fixed Pocket' })).not.toBeInTheDocument();
  });

  it('auto-selects the fixed pocket when smart mode is on, type is fixed, and an account is selected', () => {
    const onPocketChange = vi.fn();

    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={onPocketChange}
        movementType="EgresoFijo"
        enforceMovementType
      />,
    );

    expect(onPocketChange).toHaveBeenCalledWith('pkt1f');
  });

  it('clears account/pocket when smart-mode fixed type selects an account without a fixed pocket', () => {
    const onAccountChange = vi.fn();
    const onPocketChange = vi.fn();

    render(
      <AccountPocketSelector
        accountId="acc3"
        pocketId=""
        onAccountChange={onAccountChange}
        onPocketChange={onPocketChange}
        movementType="EgresoFijo"
        enforceMovementType
      />,
    );

    expect(onAccountChange).toHaveBeenCalledWith('');
    expect(onPocketChange).toHaveBeenCalledWith('');
  });

  it('clears the pocket when smart-mode non-fixed type sees a fixed pocket selected', () => {
    const onPocketChange = vi.fn();

    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1f"
        onAccountChange={vi.fn()}
        onPocketChange={onPocketChange}
        movementType="EgresoNormal"
        enforceMovementType
      />,
    );

    expect(onPocketChange).toHaveBeenCalledWith('');
  });

  it('renders the fixed pocket hint when showFixedPocketHint is on for a fixed type', () => {
    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1f"
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        movementType="EgresoFijo"
        enforceMovementType
        showFixedPocketHint
      />,
    );

    expect(screen.getByText(/Fixed expense pocket has been automatically selected/i)).toBeInTheDocument();
    // The fixed pocket name appears bolded inside the hint banner
    expect(screen.getByRole('strong')).toHaveTextContent('Fixed Pocket');
  });

  it('does not render the hint banner for non-fixed types', () => {
    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1"
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        movementType="EgresoNormal"
        enforceMovementType
        showFixedPocketHint
      />,
    );

    expect(screen.queryByText(/Fixed expense pocket has been automatically selected/i)).not.toBeInTheDocument();
  });

  it('renders the sub-pocket select when showSubPocket is on and the fixed pocket has sub-pockets', () => {
    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1f"
        subPocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        onSubPocketChange={vi.fn()}
        movementType="EgresoFijo"
        enforceMovementType
        showSubPocket
      />,
    );

    expect(screen.getByLabelText(/Sub-Pocket/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Internet' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Insurance' })).toBeInTheDocument();
  });

  it('omits the sub-pocket select for accounts whose fixed pocket has no sub-pockets', () => {
    render(
      <AccountPocketSelector
        accountId="acc2"
        pocketId="pkt2f"
        subPocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        onSubPocketChange={vi.fn()}
        movementType="EgresoFijo"
        enforceMovementType
        showSubPocket
      />,
    );

    expect(screen.queryByLabelText(/Sub-Pocket/i)).not.toBeInTheDocument();
  });

  it('fires onSubPocketChange when the user picks a sub-pocket', async () => {
    const user = userEvent.setup();
    const onSubPocketChange = vi.fn();

    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1f"
        subPocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        onSubPocketChange={onSubPocketChange}
        movementType="EgresoFijo"
        enforceMovementType
        showSubPocket
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Sub-Pocket/i), 'sp1');
    expect(onSubPocketChange).toHaveBeenCalledWith('sp1');
  });

  it('uses custom labels when provided', () => {
    render(
      <AccountPocketSelector
        accountId=""
        pocketId=""
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        accountLabel="Source Account"
        pocketLabel="Source Pocket"
      />,
    );

    expect(screen.getByLabelText(/Source Account/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Source Pocket/)).toBeInTheDocument();
  });

  it('disables both selects when disabled=true', () => {
    render(
      <AccountPocketSelector
        accountId="acc1"
        pocketId="pkt1"
        onAccountChange={vi.fn()}
        onPocketChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText(/Account/)).toBeDisabled();
    expect(screen.getByLabelText(/Pocket/)).toBeDisabled();
  });
});
