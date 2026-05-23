import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import SortableItem from '../SortableItem';

// Capture the id passed into useSortable so we can assert wiring.
const useSortableMock = vi.fn();

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: (args: { id: string }) => useSortableMock(args),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: (transform: unknown) =>
        transform ? 'translate3d(10px, 20px, 0)' : '',
    },
  },
}));

describe('SortableItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSortableMock.mockReturnValue({
      attributes: { 'aria-roledescription': 'sortable' },
      listeners: { onPointerDown: vi.fn() },
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    });
  });

  it('renders children', () => {
    render(
      <SortableItem id="item-1">
        <div>Child content</div>
      </SortableItem>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('passes the id through to useSortable', () => {
    render(
      <SortableItem id="item-42">
        <div>x</div>
      </SortableItem>,
    );
    expect(useSortableMock).toHaveBeenCalledWith({ id: 'item-42' });
  });

  it('renders the drag handle button with accessible label', () => {
    render(
      <SortableItem id="item-1">
        <div>x</div>
      </SortableItem>,
    );
    expect(
      screen.getByRole('button', { name: /drag to reorder/i }),
    ).toBeInTheDocument();
  });

  it('spreads useSortable attributes onto the drag handle', () => {
    useSortableMock.mockReturnValue({
      attributes: { 'aria-roledescription': 'sortable', tabIndex: 0 },
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    });

    render(
      <SortableItem id="item-1">
        <div>x</div>
      </SortableItem>,
    );

    const handle = screen.getByRole('button', { name: /drag to reorder/i });
    expect(handle).toHaveAttribute('aria-roledescription', 'sortable');
  });

  it('applies full opacity when not dragging', () => {
    const { container } = render(
      <SortableItem id="item-1">
        <div>x</div>
      </SortableItem>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.opacity).toBe('1');
  });

  it('applies reduced opacity while dragging', () => {
    useSortableMock.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
    });

    const { container } = render(
      <SortableItem id="item-1">
        <div>x</div>
      </SortableItem>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.opacity).toBe('0.5');
  });

  it('applies the transform style when provided', () => {
    useSortableMock.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: { x: 10, y: 20, scaleX: 1, scaleY: 1 },
      transition: 'transform 200ms ease',
      isDragging: false,
    });

    const { container } = render(
      <SortableItem id="item-1">
        <div>x</div>
      </SortableItem>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.transform).toBe('translate3d(10px, 20px, 0)');
    expect(root.style.transition).toBe('transform 200ms ease');
  });

  it('applies a custom className alongside default classes', () => {
    const { container } = render(
      <SortableItem id="item-1" className="custom-class">
        <div>x</div>
      </SortableItem>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('relative');
    expect(container.firstChild).toHaveClass('overflow-hidden');
  });

  it('forwards the setNodeRef ref callback to the root element', () => {
    const setNodeRef = vi.fn();
    useSortableMock.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef,
      transform: null,
      transition: undefined,
      isDragging: false,
    });

    render(
      <SortableItem id="item-1">
        <div>x</div>
      </SortableItem>,
    );

    expect(setNodeRef).toHaveBeenCalled();
    const refArg = setNodeRef.mock.calls[0][0];
    expect(refArg).toBeInstanceOf(HTMLElement);
  });
});
