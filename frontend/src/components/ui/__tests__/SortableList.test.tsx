import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import type { ReactNode } from 'react';
import SortableList from '../SortableList';

// We capture the onDragEnd callback the component registers with DndContext
// so the test can invoke it directly — simulating drag in jsdom is brittle
// and unnecessary for verifying the component's own logic.
let capturedDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | undefined;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
  }) => {
    capturedDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter: 'closestCenter',
  KeyboardSensor: 'KeyboardSensor',
  PointerSensor: 'PointerSensor',
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: <T,>(arr: T[], from: number, to: number): T[] => {
    const copy = [...arr];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
  },
  SortableContext: ({
    children,
    items,
  }: {
    children: ReactNode;
    items: string[];
  }) => (
    <div data-testid="sortable-context" data-items={JSON.stringify(items)}>
      {children}
    </div>
  ),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: 'vertical',
}));

interface TestItem {
  id: string;
  label: string;
}

const items: TestItem[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

const renderItem = (item: TestItem) => <div key={item.id}>{item.label}</div>;
const getId = (item: TestItem) => item.id;

describe('SortableList', () => {
  beforeEach(() => {
    capturedDragEnd = undefined;
    vi.clearAllMocks();
  });

  it('renders every item via the renderItem prop', () => {
    render(
      <SortableList items={items} onReorder={vi.fn()} renderItem={renderItem} getId={getId} />,
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('renders DndContext and SortableContext wrappers', () => {
    render(
      <SortableList items={items} onReorder={vi.fn()} renderItem={renderItem} getId={getId} />,
    );

    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
  });

  it('passes the mapped ids to SortableContext', () => {
    render(
      <SortableList items={items} onReorder={vi.fn()} renderItem={renderItem} getId={getId} />,
    );

    expect(screen.getByTestId('sortable-context')).toHaveAttribute(
      'data-items',
      JSON.stringify(['a', 'b', 'c']),
    );
  });

  it('renders cleanly when items is empty', () => {
    render(
      <SortableList<TestItem>
        items={[]}
        onReorder={vi.fn()}
        renderItem={renderItem}
        getId={getId}
      />,
    );

    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    expect(screen.getByTestId('sortable-context')).toHaveAttribute('data-items', '[]');
  });

  it('passes the index to renderItem', () => {
    const indexedRender = (item: TestItem, index: number) => (
      <div key={item.id}>{`${item.label}-${index}`}</div>
    );
    render(
      <SortableList
        items={items}
        onReorder={vi.fn()}
        renderItem={indexedRender}
        getId={getId}
      />,
    );

    expect(screen.getByText('Alpha-0')).toBeInTheDocument();
    expect(screen.getByText('Beta-1')).toBeInTheDocument();
    expect(screen.getByText('Gamma-2')).toBeInTheDocument();
  });

  it('uses getId to derive the sortable ids', () => {
    const customGetId = (item: TestItem) => `id-${item.id}`;
    render(
      <SortableList
        items={items}
        onReorder={vi.fn()}
        renderItem={renderItem}
        getId={customGetId}
      />,
    );

    expect(screen.getByTestId('sortable-context')).toHaveAttribute(
      'data-items',
      JSON.stringify(['id-a', 'id-b', 'id-c']),
    );
  });

  it('calls onReorder with the moved-forward list when a drag ends on a different item', () => {
    const onReorder = vi.fn();
    render(
      <SortableList items={items} onReorder={onReorder} renderItem={renderItem} getId={getId} />,
    );

    expect(capturedDragEnd).toBeDefined();
    capturedDragEnd!({ active: { id: 'a' }, over: { id: 'c' } });

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith([
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
      { id: 'a', label: 'Alpha' },
    ]);
  });

  it('calls onReorder with the moved-backward list when dragging up', () => {
    const onReorder = vi.fn();
    render(
      <SortableList items={items} onReorder={onReorder} renderItem={renderItem} getId={getId} />,
    );

    capturedDragEnd!({ active: { id: 'c' }, over: { id: 'a' } });

    expect(onReorder).toHaveBeenCalledWith([
      { id: 'c', label: 'Gamma' },
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]);
  });

  it('does not call onReorder when over is null', () => {
    const onReorder = vi.fn();
    render(
      <SortableList items={items} onReorder={onReorder} renderItem={renderItem} getId={getId} />,
    );

    capturedDragEnd!({ active: { id: 'a' }, over: null });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not call onReorder when active.id equals over.id', () => {
    const onReorder = vi.fn();
    render(
      <SortableList items={items} onReorder={onReorder} renderItem={renderItem} getId={getId} />,
    );

    capturedDragEnd!({ active: { id: 'a' }, over: { id: 'a' } });

    expect(onReorder).not.toHaveBeenCalled();
  });
});
