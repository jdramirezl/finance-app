import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import Input from '../Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders a label associated with the input', () => {
    render(<Input label="Username" id="username" />);
    const input = screen.getByLabelText('Username');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'username');
  });

  it('shows a required asterisk when required and label is present', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders helper text when provided and no error', () => {
    render(<Input helperText="Helpful hint" />);
    expect(screen.getByText('Helpful hint')).toBeInTheDocument();
  });

  it('renders error message and hides helper text when error is present', () => {
    render(<Input helperText="Helpful hint" error="Invalid value" />);
    expect(screen.getByText('Invalid value')).toBeInTheDocument();
    expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
  });

  it('forwards ref to the underlying input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="Ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards arbitrary HTML attributes to the input element', () => {
    render(<Input type="email" name="email" data-testid="email-input" />);
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
  });

  it('renders left and right icons when provided', () => {
    render(
      <Input
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      />,
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('disables the input when disabled prop is set', () => {
    render(<Input placeholder="Disabled" disabled />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('calls onChange when the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input placeholder="Type here" onChange={onChange} />);

    await user.type(screen.getByPlaceholderText('Type here'), 'hi');

    expect(onChange).toHaveBeenCalled();
  });

  it('generates a unique id when none is provided', () => {
    render(<Input label="Auto Id" />);
    const input = screen.getByLabelText('Auto Id');
    expect(input.id).toMatch(/^input-/);
  });
});
