import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import BulkActionsToolbar, {
  type BulkActionsToolbarProps,
} from '../BulkActionsToolbar';

const buildProps = (
  overrides: Partial<BulkActionsToolbarProps> = {},
): BulkActionsToolbarProps => ({
  selectedCount: 1,
  onClearSelection: vi.fn(),
  onApplyPending: vi.fn(),
  onMarkAsPending: vi.fn(),
  onDelete: vi.fn(),
  ...overrides,
});

describe('BulkActionsToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <BulkActionsToolbar {...buildProps({ selectedCount: 0 })} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the singular label when exactly one movement is selected', () => {
    render(<BulkActionsToolbar {...buildProps({ selectedCount: 1 })} />);

    expect(screen.getByText('1 movement selected')).toBeInTheDocument();
  });

  it('renders the plural label when more than one movement is selected', () => {
    render(<BulkActionsToolbar {...buildProps({ selectedCount: 3 })} />);

    expect(screen.getByText('3 movements selected')).toBeInTheDocument();
  });

  it('renders all bulk action buttons', () => {
    render(<BulkActionsToolbar {...buildProps({ selectedCount: 2 })} />);

    expect(
      screen.getByRole('button', { name: /clear selection/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /apply pending/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /mark as pending/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /delete selected/i }),
    ).toBeInTheDocument();
  });

  it('invokes onClearSelection when the clear link is clicked', async () => {
    const user = userEvent.setup();
    const onClearSelection = vi.fn();

    render(
      <BulkActionsToolbar {...buildProps({ onClearSelection })} />,
    );

    await user.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('invokes onApplyPending when the Apply Pending button is clicked', async () => {
    const user = userEvent.setup();
    const onApplyPending = vi.fn();

    render(<BulkActionsToolbar {...buildProps({ onApplyPending })} />);

    await user.click(screen.getByRole('button', { name: /apply pending/i }));
    expect(onApplyPending).toHaveBeenCalledTimes(1);
  });

  it('invokes onMarkAsPending when the Mark as Pending button is clicked', async () => {
    const user = userEvent.setup();
    const onMarkAsPending = vi.fn();

    render(<BulkActionsToolbar {...buildProps({ onMarkAsPending })} />);

    await user.click(screen.getByRole('button', { name: /mark as pending/i }));
    expect(onMarkAsPending).toHaveBeenCalledTimes(1);
  });

  it('invokes onDelete when the Delete Selected button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<BulkActionsToolbar {...buildProps({ onDelete })} />);

    await user.click(screen.getByRole('button', { name: /delete selected/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('supports async callbacks without throwing', async () => {
    const user = userEvent.setup();
    const onApplyPending = vi.fn().mockResolvedValue(undefined);
    const onMarkAsPending = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <BulkActionsToolbar
        {...buildProps({ onApplyPending, onMarkAsPending, onDelete })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /apply pending/i }));
    await user.click(screen.getByRole('button', { name: /mark as pending/i }));
    await user.click(screen.getByRole('button', { name: /delete selected/i }));

    expect(onApplyPending).toHaveBeenCalledTimes(1);
    expect(onMarkAsPending).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
