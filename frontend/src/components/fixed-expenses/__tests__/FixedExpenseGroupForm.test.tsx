import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import FixedExpenseGroupForm from '../FixedExpenseGroupForm';
import type { FixedExpenseGroup } from '../../../types';

// Mutations and toast hooks are mocked at module scope so the form can run
// without a TanStack-Query layer behind it.
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('../../../hooks/queries', () => ({
  useFixedExpenseGroupMutations: () => ({
    createFixedExpenseGroup: { mutateAsync: createMutateAsync, isPending: false },
    updateFixedExpenseGroup: { mutateAsync: updateMutateAsync, isPending: false },
  }),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const baseProps = {
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

const existingGroup: FixedExpenseGroup = {
  id: 'grp-42',
  name: 'Housing',
  color: '#10B981',
  displayOrder: 0,
  createdAt: '2025-01-01T00:00:00Z',
};

describe('FixedExpenseGroupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMutateAsync.mockResolvedValue(undefined);
    updateMutateAsync.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders the "New Group" heading and Create button when no initialData', () => {
      render(<FixedExpenseGroupForm {...baseProps} />);

      expect(screen.getByRole('heading', { name: /new group/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create group/i })).toBeInTheDocument();
    });

    it('renders the "Edit Group" heading and Save Changes button when editing', () => {
      render(<FixedExpenseGroupForm {...baseProps} initialData={existingGroup} />);

      expect(screen.getByRole('heading', { name: /edit group/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('hydrates the name input with the initial value when editing', () => {
      render(<FixedExpenseGroupForm {...baseProps} initialData={existingGroup} />);

      expect(screen.getByLabelText(/group name/i)).toHaveValue('Housing');
    });

    it('renders the Group Name input with placeholder copy', () => {
      render(<FixedExpenseGroupForm {...baseProps} />);

      const nameInput = screen.getByLabelText(/group name/i) as HTMLInputElement;
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.placeholder).toMatch(/housing|transportation/i);
    });

    it('renders 8 color radio options', () => {
      render(<FixedExpenseGroupForm {...baseProps} />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(8);
    });

    it('marks the default color radio as checked when creating', () => {
      render(<FixedExpenseGroupForm {...baseProps} />);

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      const checked = radios.filter((r) => r.checked);
      expect(checked).toHaveLength(1);
      expect(checked[0].value).toBe('#3B82F6');
    });

    it('marks the initial color as checked when editing', () => {
      render(<FixedExpenseGroupForm {...baseProps} initialData={existingGroup} />);

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      const checked = radios.find((r) => r.checked);
      expect(checked?.value).toBe('#10B981');
    });
  });

  describe('validation', () => {
    it('shows a required error when the name is empty on blur', async () => {
      const user = userEvent.setup();
      render(<FixedExpenseGroupForm {...baseProps} />);

      const nameInput = screen.getByLabelText(/group name/i);
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('does not call the create mutation when the form is submitted empty', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      render(
        <FixedExpenseGroupForm
          {...baseProps}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      );

      // The Group Name input is HTML-required, which blocks form submission
      // entirely in jsdom. The mutation must not fire and the form must
      // remain mounted.
      await user.click(screen.getByRole('button', { name: /create group/i }));

      expect(createMutateAsync).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('color selection', () => {
    it('updates the checked color when the user picks a different swatch', async () => {
      const user = userEvent.setup();
      render(<FixedExpenseGroupForm {...baseProps} />);

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      const target = radios.find((r) => r.value === '#EF4444');
      expect(target).toBeDefined();

      await user.click(target!);

      const newlyChecked = (
        screen.getAllByRole('radio') as HTMLInputElement[]
      ).filter((r) => r.checked);
      expect(newlyChecked).toHaveLength(1);
      expect(newlyChecked[0].value).toBe('#EF4444');
    });
  });

  describe('submission', () => {
    it('calls createFixedExpenseGroup with the entered name and default color', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      render(
        <FixedExpenseGroupForm
          {...baseProps}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      );

      await user.type(screen.getByLabelText(/group name/i), 'Subscriptions');

      await user.click(screen.getByRole('button', { name: /create group/i }));

      await waitFor(() => {
        expect(createMutateAsync).toHaveBeenCalledWith({
          name: 'Subscriptions',
          color: '#3B82F6',
        });
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/created/i)
      );
    });

    it('calls createFixedExpenseGroup with the user-selected color', async () => {
      const user = userEvent.setup();
      render(<FixedExpenseGroupForm {...baseProps} />);

      await user.type(screen.getByLabelText(/group name/i), 'Travel');

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      const purple = radios.find((r) => r.value === '#8B5CF6')!;
      await user.click(purple);

      await user.click(screen.getByRole('button', { name: /create group/i }));

      await waitFor(() => {
        expect(createMutateAsync).toHaveBeenCalledWith({
          name: 'Travel',
          color: '#8B5CF6',
        });
      });
    });

    it('calls updateFixedExpenseGroup with the id and new values when editing', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      render(
        <FixedExpenseGroupForm
          {...baseProps}
          initialData={existingGroup}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      );

      const nameInput = screen.getByLabelText(/group name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Home & Utilities');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(updateMutateAsync).toHaveBeenCalledWith({
          id: 'grp-42',
          name: 'Home & Utilities',
          color: '#10B981',
        });
      });
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/updated/i)
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(createMutateAsync).not.toHaveBeenCalled();
    });

    it('does not call onSuccess or onClose when the create mutation rejects', async () => {
      createMutateAsync.mockRejectedValueOnce(new Error('boom'));

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      render(
        <FixedExpenseGroupForm
          {...baseProps}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      );

      await user.type(screen.getByLabelText(/group name/i), 'Misc');

      await user.click(screen.getByRole('button', { name: /create group/i }));

      await waitFor(() => {
        expect(createMutateAsync).toHaveBeenCalled();
      });
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      // The form lets the mutation's onError surface the toast, so we should
      // never see a success toast on the failure path.
      expect(toastSuccess).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('calls onClose when the Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<FixedExpenseGroupForm {...baseProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(createMutateAsync).not.toHaveBeenCalled();
      expect(updateMutateAsync).not.toHaveBeenCalled();
    });
  });
});
