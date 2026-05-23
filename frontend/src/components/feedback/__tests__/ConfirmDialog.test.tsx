import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../ConfirmDialog';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Delete account',
  message: 'This action cannot be undone.',
};

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('does not render when isOpen is false', () => {
      render(<ConfirmDialog {...baseProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete account')).not.toBeInTheDocument();
    });

    it('renders the dialog with the provided title and message', () => {
      render(<ConfirmDialog {...baseProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Delete account' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('This action cannot be undone.'),
      ).toBeInTheDocument();
    });

    it('renders default Cancel and Confirm button labels', () => {
      render(<ConfirmDialog {...baseProps} />);

      expect(
        screen.getByRole('button', { name: 'Cancel' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Confirm' }),
      ).toBeInTheDocument();
    });

    it('renders custom button labels when provided', () => {
      render(
        <ConfirmDialog
          {...baseProps}
          confirmText="Yes, delete"
          cancelText="Keep it"
        />,
      );

      expect(
        screen.getByRole('button', { name: 'Keep it' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Yes, delete' }),
      ).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('applies the danger styling by default', () => {
      const { container } = render(<ConfirmDialog {...baseProps} />);

      // Danger variant uses the red palette on its icon background
      expect(
        container.querySelector('.bg-red-50, .dark\\:bg-red-900\\/20'),
      ).toBeTruthy();
    });

    it('applies the warning styling when variant is "warning"', () => {
      const { container } = render(
        <ConfirmDialog {...baseProps} variant="warning" />,
      );

      expect(
        container.querySelector('.bg-yellow-50, .dark\\:bg-yellow-900\\/20'),
      ).toBeTruthy();
    });

    it('applies the info styling when variant is "info"', () => {
      const { container } = render(
        <ConfirmDialog {...baseProps} variant="info" />,
      );

      expect(
        container.querySelector('.bg-blue-50, .dark\\:bg-blue-900\\/20'),
      ).toBeTruthy();
    });
  });

  describe('user interactions', () => {
    it('calls onClose when the Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmDialog {...baseProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm and onClose when the Confirm button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      render(
        <ConfirmDialog
          {...baseProps}
          onClose={onClose}
          onConfirm={onConfirm}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('disables the Cancel button while isLoading is true', () => {
      render(<ConfirmDialog {...baseProps} isLoading />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('disables the Confirm button while isLoading is true', () => {
      // Button passes loading to disabled, so the button is unclickable
      render(<ConfirmDialog {...baseProps} isLoading />);

      expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    });
  });
});
