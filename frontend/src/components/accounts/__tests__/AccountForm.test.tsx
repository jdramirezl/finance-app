import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import AccountForm from '../AccountForm';
import type { Account } from '../../../types';

vi.mock('../../../hooks/queries', () => ({
  useSettingsQuery: () => ({
    data: {
      primaryCurrency: 'USD',
      dateFormat: 'MMM d, yyyy',
      movementsPerPage: 50,
      reminderAdvanceDays: 7,
      defaultCurrencyForNewAccounts: 'MXN',
    },
  }),
}));

vi.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const defaultProps = {
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  isSaving: false,
};

describe('AccountForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all create-mode fields', () => {
    render(<AccountForm {...defaultProps} />);

    expect(screen.getByLabelText(/Account Name/i)).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('uses settings.defaultCurrencyForNewAccounts as the initial currency', () => {
    render(<AccountForm {...defaultProps} />);

    const currency = screen.getByLabelText(/Currency/i) as HTMLSelectElement;
    expect(currency.value).toBe('MXN');
  });

  it('shows a validation error on blur when name is empty', async () => {
    const user = userEvent.setup();
    render(<AccountForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Account Name/i);
    await user.click(nameInput);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('submits with valid data and forwards form values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AccountForm {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Account Name/i), 'Checking');
    await user.selectOptions(screen.getByLabelText(/Currency/i), 'USD');
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: 'Checking',
        currency: 'USD',
        type: 'normal',
        color: '#3B82F6',
      }),
    );
  });

  it('shows the Stock Ticker input when type is investment', async () => {
    const user = userEvent.setup();
    render(<AccountForm {...defaultProps} />);

    expect(screen.queryByLabelText(/Stock Ticker/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Account Type/i), 'investment');

    expect(await screen.findByLabelText(/Stock Ticker/i)).toBeInTheDocument();
  });

  it('shows the CD note when type is cd', async () => {
    const user = userEvent.setup();
    render(<AccountForm {...defaultProps} />);

    expect(screen.queryByText(/CD accounts require additional information/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Account Type/i), 'cd');

    expect(await screen.findByText(/CD accounts require additional information/i)).toBeInTheDocument();
  });

  it('disables the currency select when CD type is selected', async () => {
    const user = userEvent.setup();
    render(<AccountForm {...defaultProps} />);

    expect(screen.getByLabelText(/Currency/i)).not.toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/Account Type/i), 'cd');

    await waitFor(() => {
      expect(screen.getByLabelText(/Currency/i)).toBeDisabled();
    });
  });

  it('clicking Cancel calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<AccountForm {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('hides Account Type, Stock Ticker, and CD note when editing an existing account', () => {
    const initialData: Account = {
      id: 'acc1',
      name: 'My Bank',
      color: '#FF0000',
      currency: 'USD',
      balance: 1234,
      type: 'normal',
    };

    render(<AccountForm {...defaultProps} initialData={initialData} />);

    expect(screen.queryByLabelText(/Account Type/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Stock Ticker/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CD accounts require additional information/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Account/i })).toBeInTheDocument();
  });

  it('pre-fills the form with initialData values when editing', () => {
    const initialData: Account = {
      id: 'acc1',
      name: 'My Bank',
      color: '#FF0000',
      currency: 'EUR',
      balance: 1234,
      type: 'normal',
    };

    render(<AccountForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByLabelText(/Account Name/i)).toHaveValue('My Bank');
    expect((screen.getByLabelText(/Currency/i) as HTMLSelectElement).value).toBe('EUR');
  });

  it('shows the loading state on the submit button when isSaving is true', () => {
    render(<AccountForm {...defaultProps} isSaving />);

    const submit = screen.getByRole('button', { name: /Create Account/i });
    expect(submit).toBeDisabled();
  });
});
