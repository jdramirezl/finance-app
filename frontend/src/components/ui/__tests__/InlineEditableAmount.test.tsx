import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import InlineEditableAmount from '../InlineEditableAmount';

describe('InlineEditableAmount', () => {
  const defaultProps = { amount: 150, isIncome: false, onSave: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onSave = vi.fn().mockResolvedValue(undefined);
  });

  it('displays formatted amount in view mode', () => {
    render(<InlineEditableAmount {...defaultProps} />);
    expect(screen.getByRole('button', { name: /edit amount/i })).toHaveTextContent('-$150');
  });

  it('shows income formatting when isIncome is true', () => {
    render(<InlineEditableAmount {...defaultProps} isIncome={true} amount={200} />);
    expect(screen.getByRole('button', { name: /edit amount/i })).toHaveTextContent('+$200');
  });

  it('transforms to input on click', async () => {
    const user = userEvent.setup();
    render(<InlineEditableAmount {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /edit amount/i }));

    expect(screen.getByLabelText('Edit amount')).toBeInTheDocument();
  });

  it('saves on Enter and calls onSave with new amount', async () => {
    const user = userEvent.setup();
    render(<InlineEditableAmount {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /edit amount/i }));
    const input = screen.getByLabelText('Edit amount');
    await user.clear(input);
    await user.type(input, '250');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith(250);
    });
  });

  it('cancels on Escape and reverts to view mode', async () => {
    const user = userEvent.setup();
    render(<InlineEditableAmount {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /edit amount/i }));
    const input = screen.getByLabelText('Edit amount');
    expect(input).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByLabelText('Edit amount')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /edit amount/i })).toHaveTextContent('-$150');
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('does not save when value is 0 or negative', async () => {
    const user = userEvent.setup();
    render(<InlineEditableAmount {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /edit amount/i }));
    const input = screen.getByLabelText('Edit amount');
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');

    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('does not save when value is unchanged', async () => {
    const user = userEvent.setup();
    render(<InlineEditableAmount {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /edit amount/i }));
    // Value is already "150" from startEditing
    await user.keyboard('{Enter}');

    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });
});
