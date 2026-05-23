import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import Select from '../Select';

const flatOptions = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
];

const groupedOptions = [
  {
    label: 'Fruits',
    options: [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ],
  },
  {
    label: 'Vegetables',
    options: [
      { value: 'c', label: 'Carrot' },
      { value: 'd', label: 'Daikon', disabled: true },
    ],
  },
];

describe('Select', () => {
  it('renders a select element with flat options', () => {
    render(<Select options={flatOptions} aria-label="Fruit" />);
    const select = screen.getByRole('combobox', { name: 'Fruit' });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
  });

  it('marks options as disabled when specified', () => {
    render(<Select options={flatOptions} aria-label="Fruit" />);
    const cherry = screen.getByRole('option', { name: 'Cherry' }) as HTMLOptionElement;
    expect(cherry.disabled).toBe(true);
  });

  it('renders grouped options inside optgroups', () => {
    render(<Select options={groupedOptions} aria-label="Food" />);
    const fruitsGroup = document.querySelector('optgroup[label="Fruits"]');
    const vegetablesGroup = document.querySelector('optgroup[label="Vegetables"]');
    expect(fruitsGroup).not.toBeNull();
    expect(vegetablesGroup).not.toBeNull();
    expect(fruitsGroup?.querySelectorAll('option')).toHaveLength(2);
    expect(vegetablesGroup?.querySelectorAll('option')).toHaveLength(2);
  });

  it('renders a label associated with the select', () => {
    render(<Select label="Fruit" id="fruit" options={flatOptions} />);
    const select = screen.getByLabelText('Fruit');
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('id', 'fruit');
  });

  it('shows a required asterisk when required and label is present', () => {
    render(<Select label="Fruit" required options={flatOptions} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders helper text when provided and no error', () => {
    render(<Select helperText="Pick one" options={flatOptions} aria-label="Fruit" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('renders error message and hides helper text when error is present', () => {
    render(
      <Select
        helperText="Pick one"
        error="Required"
        options={flatOptions}
        aria-label="Fruit"
      />,
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Pick one')).not.toBeInTheDocument();
  });

  it('forwards ref to the underlying select element', () => {
    const ref = createRef<HTMLSelectElement>();
    render(<Select ref={ref} options={flatOptions} aria-label="Fruit" />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('disables the select when disabled prop is set', () => {
    render(<Select options={flatOptions} aria-label="Fruit" disabled />);
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toBeDisabled();
  });

  it('calls onChange when the selection changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        options={flatOptions}
        aria-label="Fruit"
        defaultValue="a"
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'Fruit' }), 'b');

    expect(onChange).toHaveBeenCalled();
  });

  it('generates a unique id when none is provided', () => {
    render(<Select label="Auto Id" options={flatOptions} />);
    const select = screen.getByLabelText('Auto Id');
    expect(select.id).toMatch(/^select-/);
  });
});
