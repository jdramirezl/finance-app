import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders children inside a button element', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Submit</Button>);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Disabled' }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });

  it('is disabled while loading and shows a spinner', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
    // Loader2 from lucide-react renders an svg
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it.each([
    ['primary', 'bg-blue-600'],
    ['secondary', 'bg-gray-200'],
    ['danger', 'bg-red-600'],
    ['ghost', 'text-gray-700'],
  ] as const)('applies the %s variant class', (variant, expectedClass) => {
    render(<Button variant={variant}>Variant</Button>);
    expect(screen.getByRole('button', { name: 'Variant' })).toHaveClass(expectedClass);
  });

  it.each([
    ['sm', 'px-3'],
    ['md', 'px-4'],
    ['lg', 'px-6'],
  ] as const)('applies the %s size class', (size, expectedClass) => {
    render(<Button size={size}>Size</Button>);
    expect(screen.getByRole('button', { name: 'Size' })).toHaveClass(expectedClass);
  });

  it('forwards type attribute to the button element', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
  });

  it('merges custom className with default classes', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('bg-blue-600');
  });
});
