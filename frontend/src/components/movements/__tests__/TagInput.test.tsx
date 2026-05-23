import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import TagInput from '../TagInput';

describe('TagInput', () => {
  it('renders existing tags as chips', () => {
    render(<TagInput value={['food', 'rent']} onChange={vi.fn()} />);

    expect(screen.getByText('food')).toBeInTheDocument();
    expect(screen.getByText('rent')).toBeInTheDocument();
  });

  it('adds a tag on Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={[]} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText(/add tags/i), 'newtag{Enter}');

    expect(onChange).toHaveBeenCalledWith(['newtag']);
  });

  it('removes a tag when clicking X', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={['food', 'rent']} onChange={onChange} />);

    await user.click(screen.getByLabelText('Remove tag food'));

    expect(onChange).toHaveBeenCalledWith(['rent']);
  });

  it('enforces max 10 tags', () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    render(<TagInput value={tags} onChange={vi.fn()} />);

    expect(screen.getByText(/maximum 10 tags/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/add tags/i)).not.toBeInTheDocument();
  });

  it('rejects duplicate tags', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={['existing']} onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'existing{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('trims and lowercases tags', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagInput value={[]} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText(/add tags/i), '  MyTag  {Enter}');

    expect(onChange).toHaveBeenCalledWith(['mytag']);
  });
});
