import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import DefaultAccountsSection from '../DefaultAccountsSection';
import type { Settings } from '../../../types';

// Mock AccountPocketSelector to a tiny harness that exposes the props
// it received and lets us trigger the change callbacks deterministically.
vi.mock('../../movements/AccountPocketSelector', () => ({
  default: (props: {
    accountId: string;
    pocketId: string;
    showAccountCurrency?: boolean;
    disabled?: boolean;
    onAccountChange: (id: string) => void;
    onPocketChange: (id: string) => void;
  }) => (
    <div data-testid="aps">
      <span data-testid="aps-account">{props.accountId}</span>
      <span data-testid="aps-pocket">{props.pocketId}</span>
      <span data-testid="aps-show-currency">{String(Boolean(props.showAccountCurrency))}</span>
      <span data-testid="aps-disabled">{String(Boolean(props.disabled))}</span>
      <button
        type="button"
        data-testid="aps-change-account"
        disabled={Boolean(props.disabled)}
        onClick={() => props.onAccountChange('new-acc')}
      >
        change-account
      </button>
      <button
        type="button"
        data-testid="aps-change-pocket"
        disabled={Boolean(props.disabled)}
        onClick={() => props.onPocketChange('new-pkt')}
      >
        change-pocket
      </button>
    </div>
  ),
}));

const baseSettings: Settings = {
  primaryCurrency: 'USD',
  dateFormat: 'MMM d, yyyy',
  movementsPerPage: 50,
  reminderAdvanceDays: 7,
  defaultCurrencyForNewAccounts: 'USD',
  defaultExpenseAccountId: 'exp-acc',
  defaultExpensePocketId: 'exp-pkt',
  defaultIncomeAccountId: 'inc-acc',
  defaultIncomePocketId: 'inc-pkt',
};

describe('DefaultAccountsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the section heading and the two sub-headings', () => {
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: /Default Accounts/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /Default for Expenses/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /Default for Income/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Set default accounts for quick-add/i)).toBeInTheDocument();
  });

  it('renders one AccountPocketSelector for expenses and one for income', () => {
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId('aps')).toHaveLength(2);
  });

  it('forwards expense and income ids from settings to each selector in order', () => {
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    const accountValues = screen.getAllByTestId('aps-account');
    const pocketValues = screen.getAllByTestId('aps-pocket');
    expect(accountValues[0]).toHaveTextContent('exp-acc');
    expect(pocketValues[0]).toHaveTextContent('exp-pkt');
    expect(accountValues[1]).toHaveTextContent('inc-acc');
    expect(pocketValues[1]).toHaveTextContent('inc-pkt');
  });

  it('falls back to empty strings when settings have no defaults', () => {
    render(
      <DefaultAccountsSection
        settings={{
          ...baseSettings,
          defaultExpenseAccountId: undefined,
          defaultExpensePocketId: undefined,
          defaultIncomeAccountId: undefined,
          defaultIncomePocketId: undefined,
        }}
        isUpdating={false}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    const accountValues = screen.getAllByTestId('aps-account');
    const pocketValues = screen.getAllByTestId('aps-pocket');
    expect(accountValues[0].textContent).toBe('');
    expect(pocketValues[0].textContent).toBe('');
    expect(accountValues[1].textContent).toBe('');
    expect(pocketValues[1].textContent).toBe('');
  });

  it('always passes showAccountCurrency to both selectors', () => {
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    const flags = screen.getAllByTestId('aps-show-currency');
    expect(flags).toHaveLength(2);
    flags.forEach((flag) => expect(flag).toHaveTextContent('true'));
  });

  it('forwards isUpdating=true to both selectors and disables their controls', () => {
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={true}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    const flags = screen.getAllByTestId('aps-disabled');
    flags.forEach((flag) => expect(flag).toHaveTextContent('true'));
    screen
      .getAllByTestId('aps-change-account')
      .forEach((btn) => expect(btn).toBeDisabled());
    screen
      .getAllByTestId('aps-change-pocket')
      .forEach((btn) => expect(btn).toBeDisabled());
  });

  it('forwards isUpdating=false to both selectors', () => {
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    const flags = screen.getAllByTestId('aps-disabled');
    flags.forEach((flag) => expect(flag).toHaveTextContent('false'));
  });

  it('calls onDefaultExpenseChange with the new accountId and an empty pocketId on account change', async () => {
    const user = userEvent.setup();
    const onDefaultExpenseChange = vi.fn();
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={onDefaultExpenseChange}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    const [expenseAccountBtn] = screen.getAllByTestId('aps-change-account');
    await user.click(expenseAccountBtn);

    expect(onDefaultExpenseChange).toHaveBeenCalledTimes(1);
    expect(onDefaultExpenseChange).toHaveBeenCalledWith('new-acc', '');
  });

  it('calls onDefaultExpenseChange with the existing accountId on pocket change', async () => {
    const user = userEvent.setup();
    const onDefaultExpenseChange = vi.fn();
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={onDefaultExpenseChange}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    const [expensePocketBtn] = screen.getAllByTestId('aps-change-pocket');
    await user.click(expensePocketBtn);

    expect(onDefaultExpenseChange).toHaveBeenCalledWith('exp-acc', 'new-pkt');
  });

  it('passes an empty existing accountId on pocket change when settings have none', async () => {
    const user = userEvent.setup();
    const onDefaultExpenseChange = vi.fn();
    render(
      <DefaultAccountsSection
        settings={{ ...baseSettings, defaultExpenseAccountId: undefined }}
        isUpdating={false}
        onDefaultExpenseChange={onDefaultExpenseChange}
        onDefaultIncomeChange={vi.fn()}
      />,
    );

    const [expensePocketBtn] = screen.getAllByTestId('aps-change-pocket');
    await user.click(expensePocketBtn);

    expect(onDefaultExpenseChange).toHaveBeenCalledWith('', 'new-pkt');
  });

  it('calls onDefaultIncomeChange with the new accountId and an empty pocketId on account change', async () => {
    const user = userEvent.setup();
    const onDefaultIncomeChange = vi.fn();
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={onDefaultIncomeChange}
      />,
    );

    const accountBtns = screen.getAllByTestId('aps-change-account');
    await user.click(accountBtns[1]);

    expect(onDefaultIncomeChange).toHaveBeenCalledWith('new-acc', '');
  });

  it('calls onDefaultIncomeChange with the existing accountId on pocket change', async () => {
    const user = userEvent.setup();
    const onDefaultIncomeChange = vi.fn();
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={vi.fn()}
        onDefaultIncomeChange={onDefaultIncomeChange}
      />,
    );

    const pocketBtns = screen.getAllByTestId('aps-change-pocket');
    await user.click(pocketBtns[1]);

    expect(onDefaultIncomeChange).toHaveBeenCalledWith('inc-acc', 'new-pkt');
  });

  it('keeps expense and income callbacks isolated from each other', async () => {
    const user = userEvent.setup();
    const onDefaultExpenseChange = vi.fn();
    const onDefaultIncomeChange = vi.fn();
    render(
      <DefaultAccountsSection
        settings={baseSettings}
        isUpdating={false}
        onDefaultExpenseChange={onDefaultExpenseChange}
        onDefaultIncomeChange={onDefaultIncomeChange}
      />,
    );

    const accountBtns = screen.getAllByTestId('aps-change-account');
    await user.click(accountBtns[0]); // expense
    expect(onDefaultExpenseChange).toHaveBeenCalledTimes(1);
    expect(onDefaultIncomeChange).not.toHaveBeenCalled();

    await user.click(accountBtns[1]); // income
    expect(onDefaultIncomeChange).toHaveBeenCalledTimes(1);
    expect(onDefaultExpenseChange).toHaveBeenCalledTimes(1);
  });
});
