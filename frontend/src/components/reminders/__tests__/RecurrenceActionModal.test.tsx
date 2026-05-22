import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import RecurrenceActionModal from '../RecurrenceActionModal';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onAction: vi.fn(),
  actionType: 'edit' as const,
};

describe('RecurrenceActionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('does not render when isOpen is false', () => {
      render(<RecurrenceActionModal {...baseProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders the dialog with the edit title when actionType is "edit"', () => {
      render(<RecurrenceActionModal {...baseProps} actionType="edit" />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /edit recurring reminder/i })
      ).toBeInTheDocument();
    });

    it('renders the dialog with the delete title when actionType is "delete"', () => {
      render(<RecurrenceActionModal {...baseProps} actionType="delete" />);

      expect(
        screen.getByRole('heading', { name: /delete recurring reminder/i })
      ).toBeInTheDocument();
    });

    it('renders the explanatory copy describing the recurring change', () => {
      render(<RecurrenceActionModal {...baseProps} />);

      expect(
        screen.getByText(/this is a recurring reminder/i)
      ).toBeInTheDocument();
    });

    it('renders the three scope buttons plus Cancel for edit mode', () => {
      render(<RecurrenceActionModal {...baseProps} actionType="edit" />);

      expect(
        screen.getByRole('button', { name: /edit this occurrence only/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /edit this and following events/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /edit all events in series/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders the three scope buttons plus Cancel for delete mode', () => {
      render(<RecurrenceActionModal {...baseProps} actionType="delete" />);

      expect(
        screen.getByRole('button', { name: /delete this occurrence only/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /delete this and following events/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /delete all events in series/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onAction with "this" when the first scope button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<RecurrenceActionModal {...baseProps} onAction={onAction} />);

      await user.click(
        screen.getByRole('button', { name: /edit this occurrence only/i })
      );
      expect(onAction).toHaveBeenCalledWith('this');
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('calls onAction with "future" when the second scope button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<RecurrenceActionModal {...baseProps} onAction={onAction} />);

      await user.click(
        screen.getByRole('button', { name: /edit this and following events/i })
      );
      expect(onAction).toHaveBeenCalledWith('future');
    });

    it('calls onAction with "all" when the third scope button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<RecurrenceActionModal {...baseProps} onAction={onAction} />);

      await user.click(
        screen.getByRole('button', { name: /edit all events in series/i })
      );
      expect(onAction).toHaveBeenCalledWith('all');
    });

    it('calls onClose when the Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<RecurrenceActionModal {...baseProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onAction with the correct scope in delete mode', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <RecurrenceActionModal
          {...baseProps}
          actionType="delete"
          onAction={onAction}
        />
      );

      await user.click(
        screen.getByRole('button', { name: /delete this and following events/i })
      );
      expect(onAction).toHaveBeenCalledWith('future');
    });

    it('does not call onAction when the modal is closed via Cancel', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const onClose = vi.fn();
      render(
        <RecurrenceActionModal
          {...baseProps}
          onAction={onAction}
          onClose={onClose}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onAction).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
