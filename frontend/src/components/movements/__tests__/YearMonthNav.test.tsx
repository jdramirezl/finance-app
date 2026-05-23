import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import YearMonthNav from '../YearMonthNav';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const defaultProps = {
  years: [2024, 2025, 2026],
  selectedYear: 2026,
  selectedMonth: 5,
  onSelect: vi.fn(),
};

describe('YearMonthNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the period label', () => {
    render(<YearMonthNav {...defaultProps} />);
    expect(screen.getByText('Period')).toBeInTheDocument();
  });

  it('renders a button per provided year', () => {
    render(<YearMonthNav {...defaultProps} />);
    expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2025' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument();
  });

  it('renders all 12 month buttons', () => {
    render(<YearMonthNav {...defaultProps} />);
    MONTH_LABELS.forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('highlights the selected year with the active style', () => {
    render(<YearMonthNav {...defaultProps} />);
    const selected = screen.getByRole('button', { name: '2026' });
    const unselected = screen.getByRole('button', { name: '2024' });

    expect(selected.className).toContain('bg-blue-500');
    expect(unselected.className).not.toContain('bg-blue-500');
  });

  it('highlights the selected month with the active style', () => {
    render(<YearMonthNav {...defaultProps} />);
    // selectedMonth: 5 → May (1-indexed)
    const selected = screen.getByRole('button', { name: 'May' });
    const unselected = screen.getByRole('button', { name: 'Jan' });

    expect(selected.className).toContain('bg-blue-500');
    expect(unselected.className).not.toContain('bg-blue-500');
  });

  it('calls onSelect with the clicked year and the current selectedMonth', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<YearMonthNav {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: '2024' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2024, 5);
  });

  it('calls onSelect with the current selectedYear and the clicked month', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<YearMonthNav {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Aug' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2026, 8);
  });

  it('disables months not present in monthsWithData', () => {
    render(
      <YearMonthNav
        {...defaultProps}
        monthsWithData={[1, 5, 12]}
      />,
    );

    const enabled = screen.getByRole('button', { name: 'Jan' });
    const disabled = screen.getByRole('button', { name: 'Feb' });

    expect(enabled.className).not.toContain('cursor-not-allowed');
    expect(disabled.className).toContain('cursor-not-allowed');
    expect(disabled.className).toContain('opacity-50');
  });

  it('does not call onSelect when a disabled month is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <YearMonthNav
        {...defaultProps}
        monthsWithData={[5]}
        onSelect={onSelect}
      />,
    );

    // Feb is disabled (only month 5 has data); pointer-events-none keeps
    // userEvent from triggering click handlers, mirroring real browser
    // behavior.
    const disabled = screen.getByRole('button', { name: 'Feb' });
    await user.click(disabled).catch(() => {
      // userEvent throws on pointer-events:none — that's the intended
      // user-blocking behavior we want to verify.
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('still allows clicking enabled months when monthsWithData is set', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <YearMonthNav
        {...defaultProps}
        monthsWithData={[1, 5]}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Jan' }));

    expect(onSelect).toHaveBeenCalledWith(2026, 1);
  });

  it('does not disable any month when monthsWithData is omitted', () => {
    render(<YearMonthNav {...defaultProps} />);

    MONTH_LABELS.forEach((label) => {
      expect(screen.getByRole('button', { name: label }).className).not.toContain('cursor-not-allowed');
    });
  });

  it('renders no year buttons when years is empty', () => {
    render(<YearMonthNav {...defaultProps} years={[]} />);

    // Years section should be empty but month section should still render.
    expect(screen.queryByRole('button', { name: /^\d{4}$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'May' })).toBeInTheDocument();
  });
});
