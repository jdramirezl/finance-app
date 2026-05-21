import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import ReminderCard from '../ReminderCard';
import type { ReminderWithProjection } from '../../../utils/reminderProjections';

const baseReminder: ReminderWithProjection = {
  id: 'rem-1',
  userId: 'user-1',
  title: 'Netflix',
  amount: 199,
  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  isPaid: false,
  recurrence: { type: 'monthly', interval: 1, endType: 'never' },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const handlers = {
  onPayNow: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onMarkAsPaid: vi.fn(),
};

describe('ReminderCard', () => {
  it('shows Pay Now and Mark as Paid for next actionable projected occurrence', () => {
    const nextActionable: ReminderWithProjection = {
      ...baseReminder,
      id: 'rem-1_projected_2025-08-15',
      isProjected: true,
      isNextActionable: true,
      originalReminderId: 'rem-1',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };

    render(<ReminderCard reminder={nextActionable} {...handlers} />);

    expect(screen.getByLabelText(/pay.*now/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mark.*as paid/i)).toBeInTheDocument();
  });

  it('hides Pay Now and Mark as Paid for future projected (non-next-actionable) occurrence', () => {
    const futureProjected: ReminderWithProjection = {
      ...baseReminder,
      id: 'rem-1_projected_2099-06-15',
      isProjected: true,
      isNextActionable: false,
      originalReminderId: 'rem-1',
      dueDate: '2099-06-15',
    };

    render(<ReminderCard reminder={futureProjected} {...handlers} />);

    expect(screen.queryByLabelText(/pay.*now/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mark.*as paid/i)).not.toBeInTheDocument();
  });

  it('hides Pay Now and Mark as Paid buttons when already paid', () => {
    const paid: ReminderWithProjection = {
      ...baseReminder,
      isPaid: true,
    };

    render(<ReminderCard reminder={paid} {...handlers} />);

    expect(screen.queryByLabelText(/pay.*now/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mark.*as paid/i)).not.toBeInTheDocument();
  });

  it('shows Pay Now and Mark as Paid for overdue projected occurrence', () => {
    const overdue: ReminderWithProjection = {
      ...baseReminder,
      id: 'rem-1_projected_2020-01-01',
      isProjected: true,
      originalReminderId: 'rem-1',
      dueDate: '2020-01-01',
    };

    render(<ReminderCard reminder={overdue} {...handlers} />);

    // Overdue status means !isProjected in status terms, so buttons show
    expect(screen.getByLabelText(/pay.*now/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mark.*as paid/i)).toBeInTheDocument();
  });

  it('calls onPayNow when Pay Now button is clicked', async () => {
    render(<ReminderCard reminder={baseReminder} {...handlers} />);

    screen.getByLabelText(/pay.*now/i).click();
    expect(handlers.onPayNow).toHaveBeenCalledWith(baseReminder);
  });
});
