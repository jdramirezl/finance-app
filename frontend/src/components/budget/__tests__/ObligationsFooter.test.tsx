import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ObligationsFooter from '../ObligationsFooter';

describe('ObligationsFooter', () => {
  const defaultProps = {
    onAddGroup: vi.fn(),
    onAddExpense: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Add Group and Add Expense buttons', () => {
    render(<ObligationsFooter {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /add group/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add expense/i }),
    ).toBeInTheDocument();
  });

  it('does not render a Bulk Generate button', () => {
    render(<ObligationsFooter {...defaultProps} />);

    expect(
      screen.queryByRole('button', { name: /bulk generate/i }),
    ).not.toBeInTheDocument();
  });

  it('calls onAddGroup when Add Group is clicked', async () => {
    const user = userEvent.setup();
    const onAddGroup = vi.fn();
    render(<ObligationsFooter {...defaultProps} onAddGroup={onAddGroup} />);

    await user.click(screen.getByRole('button', { name: /add group/i }));

    expect(onAddGroup).toHaveBeenCalledTimes(1);
  });

  it('calls onAddExpense when Add Expense is clicked', async () => {
    const user = userEvent.setup();
    const onAddExpense = vi.fn();
    render(<ObligationsFooter {...defaultProps} onAddExpense={onAddExpense} />);

    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(onAddExpense).toHaveBeenCalledTimes(1);
  });
});
