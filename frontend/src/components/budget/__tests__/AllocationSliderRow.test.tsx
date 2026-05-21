import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import AllocationSliderRow from '../AllocationSliderRow';

describe('AllocationSliderRow', () => {
  const defaultProps = {
    entry: { id: 'e1', name: 'Savings', percentage: 25 },
    color: '#4cd7f6',
    amount: 250,
    distributable: 1000,
    currency: 'USD',
    onPercentageChange: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays percentage and amount in view mode', () => {
    render(<AllocationSliderRow {...defaultProps} />);
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByLabelText(/edit amount/i)).toBeInTheDocument();
  });

  it('clicking percentage opens editable input', async () => {
    const user = userEvent.setup();
    render(<AllocationSliderRow {...defaultProps} />);

    await user.click(screen.getByLabelText(/edit percentage/i));
    expect(screen.getByRole('spinbutton', { name: /edit percentage/i })).toBeInTheDocument();
  });

  it('typing a new percentage and pressing Enter calls onPercentageChange', async () => {
    const user = userEvent.setup();
    render(<AllocationSliderRow {...defaultProps} />);

    await user.click(screen.getByLabelText(/edit percentage/i));
    const input = screen.getByRole('spinbutton', { name: /edit percentage/i });
    await user.clear(input);
    await user.type(input, '50');
    await user.keyboard('{Enter}');

    expect(defaultProps.onPercentageChange).toHaveBeenCalledWith('e1', 50);
  });

  it('pressing Escape on percentage input cancels without saving', async () => {
    const user = userEvent.setup();
    render(<AllocationSliderRow {...defaultProps} />);

    await user.click(screen.getByLabelText(/edit percentage/i));
    const input = screen.getByRole('spinbutton', { name: /edit percentage/i });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('spinbutton', { name: /edit percentage/i })).not.toBeInTheDocument();
    });
    expect(defaultProps.onPercentageChange).not.toHaveBeenCalled();
  });

  it('clicking amount opens editable input', async () => {
    const user = userEvent.setup();
    render(<AllocationSliderRow {...defaultProps} />);

    await user.click(screen.getByLabelText(/edit amount/i));
    expect(screen.getByRole('spinbutton', { name: /edit amount/i })).toBeInTheDocument();
  });

  it('typing a new amount reverse-calculates percentage', async () => {
    const user = userEvent.setup();
    render(<AllocationSliderRow {...defaultProps} />);

    await user.click(screen.getByLabelText(/edit amount/i));
    const input = screen.getByRole('spinbutton', { name: /edit amount/i });
    await user.clear(input);
    await user.type(input, '500');
    await user.keyboard('{Enter}');

    // 500 / 1000 * 100 = 50%
    expect(defaultProps.onPercentageChange).toHaveBeenCalledWith('e1', 50);
  });

  it('clamps percentage to 0-100 range', async () => {
    const user = userEvent.setup();
    render(<AllocationSliderRow {...defaultProps} />);

    await user.click(screen.getByLabelText(/edit percentage/i));
    const input = screen.getByRole('spinbutton', { name: /edit percentage/i });
    await user.clear(input);
    await user.type(input, '150');
    await user.keyboard('{Enter}');

    expect(defaultProps.onPercentageChange).toHaveBeenCalledWith('e1', 100);
  });

  it('does not save amount when distributable is 0', async () => {
    const user = userEvent.setup();
    render(<AllocationSliderRow {...defaultProps} distributable={0} />);

    await user.click(screen.getByLabelText(/edit amount/i));
    const input = screen.getByRole('spinbutton', { name: /edit amount/i });
    await user.clear(input);
    await user.type(input, '500');
    await user.keyboard('{Enter}');

    expect(defaultProps.onPercentageChange).not.toHaveBeenCalled();
  });

  it('slider drag calls onPercentageChange', () => {
    render(<AllocationSliderRow {...defaultProps} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '60' } });
    expect(defaultProps.onPercentageChange).toHaveBeenCalledWith('e1', 60);
  });
});
