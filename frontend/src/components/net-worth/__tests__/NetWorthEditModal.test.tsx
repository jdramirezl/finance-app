import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRef } from 'react';
import { fireEvent, render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import NetWorthEditModal, {
  type NetWorthEditModalHandle,
} from '../NetWorthEditModal';
import type { NetWorthSnapshot } from '../../../services/netWorthSnapshotService';

/**
 * Tests for {@link NetWorthEditModal}. The modal owns its own visibility
 * and form state and exposes an imperative `open(snapshot)` handle. The
 * tests drive it through a small harness that holds the ref so they can
 * exercise the same flow real consumers use (chart click → ref.open).
 */

const mocks = vi.hoisted(() => ({
  updateMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  deleteMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  confirm: vi.fn(),
}));

vi.mock('../../../hooks/queries/useNetWorthSnapshotQueries', () => ({
  useNetWorthSnapshotMutations: () => ({
    updateMutation: mocks.updateMutation,
    deleteMutation: mocks.deleteMutation,
  }),
}));

vi.mock('../../../contexts/ConfirmDialogContext', () => ({
  useConfirmDialog: () => ({ confirm: mocks.confirm }),
}));

const buildSnapshot = (
  overrides: Partial<NetWorthSnapshot> = {},
): NetWorthSnapshot => ({
  id: 'snap-1',
  userId: 'u-1',
  // Date-only ISO so parseISO yields local midnight and the formatted
  // output is timezone-stable across the test runner's environment.
  snapshotDate: '2026-03-15',
  totalNetWorth: 12345.67,
  baseCurrency: 'USD',
  breakdown: { USD: 12345.67 },
  createdAt: '2026-03-15T10:00:00.000Z',
  ...overrides,
});

const TestHarness = ({ snapshot }: { snapshot: NetWorthSnapshot }) => {
  const ref = useRef<NetWorthEditModalHandle>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.open(snapshot)}>
        open-modal
      </button>
      <NetWorthEditModal ref={ref} />
    </>
  );
};

describe('NetWorthEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMutation.mutateAsync.mockResolvedValue(undefined);
    mocks.deleteMutation.mutateAsync.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
    mocks.updateMutation.isPending = false;
    mocks.deleteMutation.isPending = false;
  });

  it('does not render the modal contents until open() is called', () => {
    render(<TestHarness snapshot={buildSnapshot()} />);

    expect(screen.queryByText(/edit snapshot/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/total net worth/i)).not.toBeInTheDocument();
  });

  it('opens the modal pre-populated with the snapshot date and value', async () => {
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));

    expect(await screen.findByText(/edit snapshot/i)).toBeInTheDocument();
    expect(screen.getByText('March 15, 2026')).toBeInTheDocument();
    expect(screen.getByLabelText(/total net worth/i)).toHaveValue(12345.67);
  });

  it('forwards the new value to updateMutation and closes the modal on save', async () => {
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));

    const input = await screen.findByLabelText(/total net worth/i);
    fireEvent.change(input, { target: { value: '20000' } });
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'snap-1',
        data: { totalNetWorth: 20000 },
      });
    });
    await waitFor(() => {
      expect(screen.queryByText(/edit snapshot/i)).not.toBeInTheDocument();
    });
  });

  it('does not save when the input is cleared', async () => {
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));

    const input = await screen.findByLabelText(/total net worth/i);
    fireEvent.change(input, { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mocks.updateMutation.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/edit snapshot/i)).toBeInTheDocument();
  });

  it('does not save when the input is negative', async () => {
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));

    const input = await screen.findByLabelText(/total net worth/i);
    fireEvent.change(input, { target: { value: '-100' } });
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mocks.updateMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('closes the modal when Cancel is clicked without saving', async () => {
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));
    expect(await screen.findByText(/edit snapshot/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/edit snapshot/i)).not.toBeInTheDocument();
    });
    expect(mocks.updateMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('asks for confirmation and forwards the snapshot id when delete is confirmed', async () => {
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));
    await user.click(await screen.findByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Snapshot',
          variant: 'danger',
        }),
      );
    });
    await waitFor(() => {
      expect(mocks.deleteMutation.mutateAsync).toHaveBeenCalledWith('snap-1');
    });
    await waitFor(() => {
      expect(screen.queryByText(/edit snapshot/i)).not.toBeInTheDocument();
    });
  });

  it('does not delete when the user cancels the confirmation', async () => {
    mocks.confirm.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));
    await user.click(await screen.findByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled();
    });
    expect(mocks.deleteMutation.mutateAsync).not.toHaveBeenCalled();
    // Modal stays open so the user can pick a different action.
    expect(screen.getByText(/edit snapshot/i)).toBeInTheDocument();
  });

  it('disables the Save button while the update mutation is pending', async () => {
    mocks.updateMutation.isPending = true;
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));

    const saveBtn = await screen.findByRole('button', { name: /save changes/i });
    expect(saveBtn).toBeDisabled();
  });

  it('disables the Delete button while the delete mutation is pending', async () => {
    mocks.deleteMutation.isPending = true;
    const user = userEvent.setup();
    render(<TestHarness snapshot={buildSnapshot()} />);

    await user.click(screen.getByRole('button', { name: /open-modal/i }));

    const deleteBtn = await screen.findByRole('button', { name: /delete/i });
    expect(deleteBtn).toBeDisabled();
  });
});
