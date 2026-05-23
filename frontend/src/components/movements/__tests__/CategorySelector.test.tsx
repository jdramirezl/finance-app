import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import CategorySelector from '../CategorySelector';
import { PREDEFINED_CATEGORIES } from '../../../constants/categories';

describe('CategorySelector', () => {
  const defaultProps = { value: '', onChange: vi.fn() };

  it('renders predefined categories in dropdown on focus', async () => {
    const user = userEvent.setup();
    render(<CategorySelector {...defaultProps} />);

    await user.click(screen.getByPlaceholderText(/select or type/i));

    for (const cat of PREDEFINED_CATEGORIES) {
      expect(screen.getByText(cat)).toBeInTheDocument();
    }
  });

  it('calls onChange when selecting a category', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CategorySelector value="" onChange={onChange} />);

    await user.click(screen.getByPlaceholderText(/select or type/i));
    await user.click(screen.getByText('Food'));

    expect(onChange).toHaveBeenCalledWith('Food');
  });

  it('filters the list when typing', async () => {
    const user = userEvent.setup();
    render(<CategorySelector {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/select or type/i), 'Ent');

    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
  });

  it('allows custom category input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CategorySelector value="" onChange={onChange} />);

    await user.type(screen.getByPlaceholderText(/select or type/i), 'CustomCat');

    expect(onChange).toHaveBeenLastCalledWith('CustomCat');
  });

  it('closes dropdown on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>outside</button>
        <CategorySelector {...defaultProps} />
      </div>,
    );

    await user.click(screen.getByPlaceholderText(/select or type/i));
    expect(screen.getByText('Food')).toBeInTheDocument();

    await user.click(screen.getByText('outside'));
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
  });
});
