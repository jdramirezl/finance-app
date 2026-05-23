import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import CollapsibleSection from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  const defaultProps = {
    title: 'Section Title',
    isExpanded: false,
    onToggle: vi.fn(),
    children: <div>Section Content</div>,
  };

  it('renders the title in the header', () => {
    render(<CollapsibleSection {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Section Title' })).toBeInTheDocument();
  });

  it('does not render children when collapsed', () => {
    render(<CollapsibleSection {...defaultProps} isExpanded={false} />);
    expect(screen.queryByText('Section Content')).not.toBeInTheDocument();
  });

  it('renders children when expanded', () => {
    render(<CollapsibleSection {...defaultProps} isExpanded={true} />);
    expect(screen.getByText('Section Content')).toBeInTheDocument();
  });

  it('calls onToggle when the header button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<CollapsibleSection {...defaultProps} onToggle={onToggle} />);

    await user.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders the count badge when count is provided', () => {
    render(<CollapsibleSection {...defaultProps} count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders count of 0 when explicitly set', () => {
    render(<CollapsibleSection {...defaultProps} count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('does not render the count badge when count is undefined', () => {
    const { container } = render(<CollapsibleSection {...defaultProps} />);
    // Title is the only "text" in the header besides chevron icon; no count pill
    const pill = container.querySelector('.rounded-full');
    expect(pill).not.toBeInTheDocument();
  });

  it('renders the summary slot when provided', () => {
    render(
      <CollapsibleSection
        {...defaultProps}
        summary={<span>$1,234.56</span>}
      />,
    );
    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });

  it('applies a custom className to the root container', () => {
    const { container } = render(
      <CollapsibleSection {...defaultProps} className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('toggles content visibility based on isExpanded prop', () => {
    const { rerender } = render(
      <CollapsibleSection {...defaultProps} isExpanded={false} />,
    );
    expect(screen.queryByText('Section Content')).not.toBeInTheDocument();

    rerender(<CollapsibleSection {...defaultProps} isExpanded={true} />);
    expect(screen.getByText('Section Content')).toBeInTheDocument();

    rerender(<CollapsibleSection {...defaultProps} isExpanded={false} />);
    expect(screen.queryByText('Section Content')).not.toBeInTheDocument();
  });
});
