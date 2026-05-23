import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import Card from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <span>Card body</span>
      </Card>,
    );
    expect(screen.getByText('Card body')).toBeInTheDocument();
  });

  it.each([
    ['default', 'border-gray-200'],
    ['interactive', 'cursor-pointer'],
    ['highlighted', 'border-blue-500'],
    ['danger', 'border-red-500'],
  ] as const)('applies the %s variant class', (variant, expectedClass) => {
    render(
      <Card variant={variant} data-testid="card">
        content
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass(expectedClass);
  });

  it.each([
    ['none', ''],
    ['sm', 'p-4'],
    ['md', 'p-6'],
    ['lg', 'p-8'],
  ] as const)('applies the %s padding class', (padding, expectedClass) => {
    render(
      <Card padding={padding} data-testid="card">
        content
      </Card>,
    );
    const card = screen.getByTestId('card');
    if (expectedClass) {
      expect(card).toHaveClass(expectedClass);
    } else {
      expect(card.className).not.toMatch(/\bp-\d+\b/);
    }
  });

  it('applies hover styles when hover prop is true', () => {
    render(
      <Card hover data-testid="card">
        content
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('hover:shadow-lg');
  });

  it('does not apply hover styles when hover prop is false', () => {
    render(
      <Card data-testid="card">
        content
      </Card>,
    );
    expect(screen.getByTestId('card')).not.toHaveClass('hover:shadow-lg');
  });

  it('forwards arbitrary HTML attributes such as onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card onClick={onClick} data-testid="card">
        clickable
      </Card>,
    );

    await user.click(screen.getByTestId('card'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges custom className with default classes', () => {
    render(
      <Card className="custom-class" data-testid="card">
        content
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('bg-white');
  });

  it('supports role attribute for accessibility', () => {
    render(
      <Card role="region" aria-label="Summary">
        content
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Summary' })).toBeInTheDocument();
  });
});
