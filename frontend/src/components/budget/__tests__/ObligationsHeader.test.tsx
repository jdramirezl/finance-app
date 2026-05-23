import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import ObligationsHeader from '../ObligationsHeader';

describe('ObligationsHeader', () => {
  const defaultProps = {
    enabledCount: 8,
    totalCount: 12,
    totalMonthly: 3420,
    currency: 'USD',
  };

  it('renders the title', () => {
    render(<ObligationsHeader {...defaultProps} />);

    expect(screen.getByText('Fixed Obligations')).toBeInTheDocument();
  });

  it('renders the count badge with enabled/total format', () => {
    render(<ObligationsHeader {...defaultProps} />);

    expect(screen.getByText('8/12')).toBeInTheDocument();
  });

  it('applies pill badge styling to the count', () => {
    render(<ObligationsHeader {...defaultProps} />);

    const badge = screen.getByText('8/12');
    expect(badge.className).toMatch(/bg-blue-500\/20/);
    expect(badge.className).toMatch(/text-blue-400/);
    expect(badge.className).toMatch(/rounded-full/);
  });

  it('renders the total monthly amount formatted as currency', () => {
    render(<ObligationsHeader {...defaultProps} />);

    // Intl currency formatting for USD with no fractional input still pads decimals.
    expect(screen.getByText('$3,420.00')).toBeInTheDocument();
  });

  it('formats the total amount using the provided currency', () => {
    render(
      <ObligationsHeader
        enabledCount={2}
        totalCount={5}
        totalMonthly={1500.5}
        currency="EUR"
      />,
    );

    // Locale-dependent symbol/order — just assert the numeric portion is present.
    expect(screen.getByText(/1,500\.50/)).toBeInTheDocument();
  });

  it('renders zero counts and zero amount without errors', () => {
    render(
      <ObligationsHeader
        enabledCount={0}
        totalCount={0}
        totalMonthly={0}
        currency="USD"
      />,
    );

    expect(screen.getByText('0/0')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });
});
