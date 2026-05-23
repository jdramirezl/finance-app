import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import DistributionHeader from '../DistributionHeader';

describe('DistributionHeader', () => {
  const defaultProps = {
    distributable: 1500.5,
    currency: 'USD',
    totalPercentage: 0,
  };

  it('renders the title and subtitle', () => {
    render(<DistributionHeader {...defaultProps} />);

    expect(screen.getByText('Available to Distribute')).toBeInTheDocument();
    expect(
      screen.getByText('Remainder from fixed obligations'),
    ).toBeInTheDocument();
  });

  it('renders the formatted distributable amount', () => {
    render(<DistributionHeader {...defaultProps} distributable={1500.5} />);

    // formatCurrency('USD') -> "$1,500.50"
    expect(screen.getByText('$1,500.50')).toBeInTheDocument();
  });

  it('renders a gray "Not allocated" badge when totalPercentage is 0', () => {
    render(<DistributionHeader {...defaultProps} totalPercentage={0} />);

    const badge = screen.getByText('Not allocated');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-gray-700/);
    expect(badge.className).toMatch(/text-gray-400/);
  });

  it('renders an amber "Allocated: X%" badge when totalPercentage is below 100', () => {
    render(<DistributionHeader {...defaultProps} totalPercentage={50} />);

    const badge = screen.getByText('Allocated: 50%');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-amber-500\/20/);
    expect(badge.className).toMatch(/text-amber-400/);
  });

  it('renders a green "Allocated: 100%" badge when totalPercentage equals 100', () => {
    render(<DistributionHeader {...defaultProps} totalPercentage={100} />);

    const badge = screen.getByText('Allocated: 100%');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-green-500\/20/);
    expect(badge.className).toMatch(/text-green-400/);
  });

  it('renders a red "Over-allocated: X%" badge when totalPercentage exceeds 100', () => {
    render(<DistributionHeader {...defaultProps} totalPercentage={120} />);

    const badge = screen.getByText('Over-allocated: 120%');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-red-500\/20/);
    expect(badge.className).toMatch(/text-red-400/);
  });
});
