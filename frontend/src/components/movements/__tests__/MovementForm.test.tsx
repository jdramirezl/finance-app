import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import MovementForm from '../MovementForm';
import type { MovementFormProps } from '../MovementForm';

const mockAccounts = [
  { id: 'acc1', name: 'Checking', color: '#000', currency: 'USD', balance: 1000, type: 'normal' as const },
  { id: 'acc2', name: 'Savings', color: '#111', currency: 'USD', balance: 5000, type: 'normal' as const },
];

const mockPockets = [
  { id: 'pkt1', name: 'Daily', accountId: 'acc1', balance: 500, type: 'normal' as const },
  { id: 'pkt2', name: 'Reserve', accountId: 'acc2', balance: 3000, type: 'normal' as const },
];

const mockTemplates = [
  {
    id: 'tpl1',
    name: 'Monthly Rent',
    accountId: 'acc1',
    pocketId: 'pkt1',
    subPocketId: '',
    type: 'EgresoNormal' as const,
    defaultAmount: 1200,
    notes: 'Rent payment',
  },
];

vi.mock('../../../hooks/queries', () => ({
  useAccountsQuery: () => ({ data: mockAccounts }),
  usePocketsQuery: () => ({ data: mockPockets }),
  useSubPocketsQuery: () => ({ data: [] }),
  useMovementTemplatesQuery: () => ({ data: mockTemplates }),
}));

vi.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const defaultProps: MovementFormProps = {
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  isSaving: false,
};

describe('MovementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required fields', () => {
    render(<MovementForm {...defaultProps} />);

    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('shows red asterisk on required fields', () => {
    render(<MovementForm {...defaultProps} />);

    const typeLabel = screen.getByText('Type').closest('label');
    const dateLabel = screen.getByText('Date').closest('label');
    const amountLabel = screen.getByText('Amount').closest('label');

    expect(typeLabel?.querySelector('.text-red-500')).toHaveTextContent('*');
    expect(dateLabel?.querySelector('.text-red-500')).toHaveTextContent('*');
    expect(amountLabel?.querySelector('.text-red-500')).toHaveTextContent('*');
  });

  it('shows validation errors on blur for empty required fields', async () => {
    const user = userEvent.setup();
    render(<MovementForm {...defaultProps} />);

    const amountInput = screen.getByLabelText(/amount/i);
    await user.click(amountInput);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
    });
  });

  it('submits with valid data and calls onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MovementForm {...defaultProps} onSubmit={onSubmit} />);

    // Fill amount
    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, '100');

    // Select account via AccountPocketSelector
    const accountSelect = screen.getByLabelText(/Account/);
    await user.selectOptions(accountSelect, 'acc1');

    // Select pocket
    const pocketSelect = screen.getByLabelText(/Pocket/);
    await user.selectOptions(pocketSelect, 'pkt1');

    // Submit
    await user.click(screen.getByRole('button', { name: /create movement/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '100',
          accountId: 'acc1',
          pocketId: 'pkt1',
          isTransfer: false,
        }),
      );
    });
  });

  it('shows target account/pocket fields in transfer mode', async () => {
    const user = userEvent.setup();
    render(<MovementForm {...defaultProps} />);

    // Select Transfer type
    const typeSelect = screen.getByLabelText(/type/i);
    await user.selectOptions(typeSelect, 'Transfer');

    await waitFor(() => {
      expect(screen.getByLabelText(/target account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target pocket/i)).toBeInTheDocument();
    });
  });

  it('loads template and populates form fields', async () => {
    const user = userEvent.setup();
    const onTemplateSelect = vi.fn();
    render(
      <MovementForm
        {...defaultProps}
        selectedTemplateId=""
        onTemplateSelect={onTemplateSelect}
      />,
    );

    const templateSelect = screen.getByLabelText(/load template/i);
    await user.selectOptions(templateSelect, 'tpl1');

    await waitFor(() => {
      expect(onTemplateSelect).toHaveBeenCalledWith('tpl1');
      expect(screen.getByLabelText(/amount/i)).toHaveValue(1200);
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Rent payment');
    });
  });

  it('renders category selector and tag input', () => {
    render(<MovementForm {...defaultProps} />);

    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('hides template selector when editing existing movement', () => {
    render(
      <MovementForm
        {...defaultProps}
        initialData={{
          id: 'mov1',
          type: 'EgresoNormal',
          accountId: 'acc1',
          pocketId: 'pkt1',
          amount: 50,
          notes: 'test',
          displayedDate: '2026-01-15T00:00:00.000Z',
          createdAt: '2026-01-15T00:00:00.000Z',
          isPending: false,
          isOrphaned: false,
        }}
      />,
    );

    expect(screen.queryByLabelText(/load template/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update movement/i })).toBeInTheDocument();
  });
});
