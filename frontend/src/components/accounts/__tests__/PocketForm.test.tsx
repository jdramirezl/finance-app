import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import PocketForm from '../PocketForm';
import type { Pocket } from '../../../types';

vi.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const defaultProps = {
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  isSaving: false,
};

describe('PocketForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the create-mode fields and buttons', () => {
    render(<PocketForm {...defaultProps} />);

    expect(screen.getByLabelText(/Pocket Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pocket Type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Pocket/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('marks Pocket Name as required with a red asterisk', () => {
    render(<PocketForm {...defaultProps} />);

    const nameLabel = screen.getByText('Pocket Name').closest('label');
    expect(nameLabel?.querySelector('.text-red-500')).toHaveTextContent('*');
  });

  it('renders the placeholder hint text in the Pocket Name input', () => {
    render(<PocketForm {...defaultProps} />);

    expect(screen.getByPlaceholderText(/Savings, Emergency Fund/i)).toBeInTheDocument();
  });

  it('renders both pocket type options in create mode', () => {
    render(<PocketForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/Pocket Type/i) as HTMLSelectElement;
    const optionValues = Array.from(typeSelect.options).map((o) => o.value);

    expect(optionValues).toEqual(['normal', 'fixed']);
    expect(screen.getByRole('option', { name: 'Normal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Fixed Expenses' })).toBeInTheDocument();
  });

  it('shows a validation error on blur when name is empty', async () => {
    const user = userEvent.setup();
    render(<PocketForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Pocket Name/i);
    await user.click(nameInput);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('does not submit when the name is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PocketForm {...defaultProps} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /Create Pocket/i }));

    // react-hook-form blocks submission of invalid forms.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with valid data and forwards form values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PocketForm {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Pocket Name/i), 'Travel');
    await user.selectOptions(screen.getByLabelText(/Pocket Type/i), 'fixed');
    await user.click(screen.getByRole('button', { name: /Create Pocket/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Travel',
      type: 'fixed',
    });
  });

  it('defaults the pocket type to "normal" when not changed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PocketForm {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Pocket Name/i), 'Daily');
    await user.click(screen.getByRole('button', { name: /Create Pocket/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Daily',
      type: 'normal',
    });
  });

  it('calls onCancel when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PocketForm {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the loading state on the submit button when isSaving is true', () => {
    render(<PocketForm {...defaultProps} isSaving />);

    expect(screen.getByRole('button', { name: /Create Pocket/i })).toBeDisabled();
  });

  describe('edit mode', () => {
    const existingPocket: Pocket = {
      id: 'pkt1',
      accountId: 'acc1',
      name: 'Existing Pocket',
      type: 'normal',
      balance: 250,
      currency: 'USD',
    };

    it('hides the Pocket Type select when editing', () => {
      render(<PocketForm {...defaultProps} initialData={existingPocket} />);

      expect(screen.queryByLabelText(/Pocket Type/i)).not.toBeInTheDocument();
    });

    it('shows "Update Pocket" instead of "Create Pocket" when editing', () => {
      render(<PocketForm {...defaultProps} initialData={existingPocket} />);

      expect(screen.getByRole('button', { name: /Update Pocket/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Create Pocket/i })).not.toBeInTheDocument();
    });

    it('pre-fills the name input with the initial value', () => {
      render(<PocketForm {...defaultProps} initialData={existingPocket} />);

      expect(screen.getByLabelText(/Pocket Name/i)).toHaveValue('Existing Pocket');
    });

    it('submits the edited name and forwards the value', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <PocketForm
          {...defaultProps}
          initialData={existingPocket}
          onSubmit={onSubmit}
        />,
      );

      const nameInput = screen.getByLabelText(/Pocket Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Renamed');
      await user.click(screen.getByRole('button', { name: /Update Pocket/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      expect(onSubmit.mock.calls[0][0].name).toBe('Renamed');
    });
  });
});
