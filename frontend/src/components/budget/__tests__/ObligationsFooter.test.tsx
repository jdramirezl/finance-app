import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ObligationsFooter from '../ObligationsFooter';

describe('ObligationsFooter', () => {
  const defaultProps = {
    onAddGroup: vi.fn(),
    onAddExpense: vi.fn(),
    onBulkGenerate: vi.fn(),
    bulkDisabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three buttons', () => {
    render(<ObligationsFooter {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /add group/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add expense/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /bulk generate/i }),
    ).toBeInTheDocument();
  });

  it('disables Bulk Generate when bulkDisabled is true', () => {
    render(<ObligationsFooter {...defaultProps} bulkDisabled={true} />);

    expect(
      screen.getByRole('button', { name: /bulk generate/i }),
    ).toBeDisabled();
  });

  it('keeps Bulk Generate enabled when bulkDisabled is false', () => {
    render(<ObligationsFooter {...defaultProps} bulkDisabled={false} />);

    expect(
      screen.getByRole('button', { name: /bulk generate/i }),
    ).not.toBeDisabled();
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

  it('calls onBulkGenerate when Bulk Generate is clicked', async () => {
    const user = userEvent.setup();
    const onBulkGenerate = vi.fn();
    render(
      <ObligationsFooter {...defaultProps} onBulkGenerate={onBulkGenerate} />,
    );

    await user.click(screen.getByRole('button', { name: /bulk generate/i }));

    expect(onBulkGenerate).toHaveBeenCalledTimes(1);
  });

  it('does not call onBulkGenerate when disabled and clicked', async () => {
    const user = userEvent.setup();
    const onBulkGenerate = vi.fn();
    render(
      <ObligationsFooter
        {...defaultProps}
        onBulkGenerate={onBulkGenerate}
        bulkDisabled={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: /bulk generate/i }));

    expect(onBulkGenerate).not.toHaveBeenCalled();
  });
});
