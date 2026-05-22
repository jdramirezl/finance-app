import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import BudgetIncomeSection from '../BudgetIncomeSection';

describe('BudgetIncomeSection', () => {
  const defaultProps = {
    initialAmount: 0,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the input with label and helper text', () => {
    render(<BudgetIncomeSection {...defaultProps} />);

    expect(screen.getByLabelText(/initial amount/i)).toBeInTheDocument();
    expect(
      screen.getByText(/typically your monthly income/i),
    ).toBeInTheDocument();
  });

  it('renders the placeholder when amount is zero', () => {
    render(<BudgetIncomeSection {...defaultProps} initialAmount={0} />);

    expect(
      screen.getByPlaceholderText(/enter your total amount/i),
    ).toBeInTheDocument();
  });

  it('displays the provided initialAmount', () => {
    render(<BudgetIncomeSection {...defaultProps} initialAmount={1500} />);

    expect(screen.getByLabelText(/initial amount/i)).toHaveValue(1500);
  });

  it('shows empty value when initialAmount is 0 (falsy fallback)', () => {
    render(<BudgetIncomeSection {...defaultProps} initialAmount={0} />);

    // value={initialAmount || ''} renders '' for 0
    expect(screen.getByLabelText(/initial amount/i)).toHaveValue(null);
  });

  it('calls onChange with parsed number when user types', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BudgetIncomeSection initialAmount={0} onChange={onChange} />);

    const input = screen.getByLabelText(/initial amount/i);
    await user.type(input, '5');

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('calls onChange with 0 when input is cleared (NaN fallback)', () => {
    const onChange = vi.fn();
    render(<BudgetIncomeSection initialAmount={1000} onChange={onChange} />);

    const input = screen.getByLabelText(/initial amount/i);
    fireEvent.change(input, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('parses decimal values correctly', () => {
    const onChange = vi.fn();
    render(<BudgetIncomeSection initialAmount={0} onChange={onChange} />);

    const input = screen.getByLabelText(/initial amount/i);
    fireEvent.change(input, { target: { value: '123.45' } });

    expect(onChange).toHaveBeenCalledWith(123.45);
  });

  it('uses number type input with correct min and step', () => {
    render(<BudgetIncomeSection {...defaultProps} />);

    const input = screen.getByLabelText(/initial amount/i);
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('step', '0.01');
  });
});
