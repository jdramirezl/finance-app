import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useMovementBulkActions } from '../actions/useMovementBulkActions';
import type { UseMovementBulkActionsParams } from '../actions/useMovementBulkActions';
import type { BulkSelectionResult } from '../useBulkSelection';
import type { Movement } from '../../types';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockMovement = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'mov-1',
  type: 'EgresoNormal',
  accountId: 'acc-1',
  pocketId: 'pkt-1',
  amount: 100,
  notes: '',
  displayedDate: '2025-06-15',
  createdAt: '2025-06-15T00:00:00.000Z',
  ...overrides,
});

interface BulkOverrides {
  selectedIds?: string[];
}

const buildBulk = ({ selectedIds = ['mov-1'] }: BulkOverrides = {}): BulkSelectionResult & {
  deselectAll: ReturnType<typeof vi.fn>;
} => {
  const deselectAll = vi.fn();
  return {
    selectedIds: new Set(selectedIds),
    selectedCount: selectedIds.length,
    isSelected: (id: string) => selectedIds.includes(id),
    toggleSelection: vi.fn(),
    selectAll: vi.fn(),
    deselectAll,
  };
};

const buildParams = (
  overrides: Partial<UseMovementBulkActionsParams> = {},
): {
  params: UseMovementBulkActionsParams;
  toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  confirm: ReturnType<typeof vi.fn>;
  applyPending: ReturnType<typeof vi.fn>;
  markAsPending: ReturnType<typeof vi.fn>;
  deleteOp: ReturnType<typeof vi.fn>;
  bulk: ReturnType<typeof buildBulk>;
} => {
  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
  const confirm = vi.fn().mockResolvedValue(true);
  const applyPending = vi.fn().mockResolvedValue(undefined);
  const markAsPending = vi.fn().mockResolvedValue(undefined);
  const deleteOp = vi.fn().mockResolvedValue(undefined);
  const bulk = (overrides.bulk as ReturnType<typeof buildBulk> | undefined) ?? buildBulk();

  // The hook iterates via `ids.map(fn)`, which passes `(id, index, array)`
  // to each operation. Wrapping with `(id) => spy(id)` makes our assertions
  // about the called id straightforward without having to account for
  // map's incidental extra arguments.
  const params: UseMovementBulkActionsParams = {
    bulk,
    movements: [mockMovement()],
    confirm: confirm as unknown as UseMovementBulkActionsParams['confirm'],
    toast: toast as unknown as UseMovementBulkActionsParams['toast'],
    operations: {
      applyPending: (id) => applyPending(id),
      markAsPending: (id) => markAsPending(id),
      delete: (id) => deleteOp(id),
    },
    ...overrides,
  };

  return { params, toast, confirm, applyPending, markAsPending, deleteOp, bulk };
};

const setup = (overrides: Partial<UseMovementBulkActionsParams> = {}) => {
  const fixtures = buildParams(overrides);
  const wrapper = createWrapper();
  const rendered = renderHook(() => useMovementBulkActions(fixtures.params), { wrapper });
  return { ...fixtures, ...rendered };
};

describe('useMovementBulkActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleBulkApplyPending', () => {
    it('skips the action when the user cancels confirmation', async () => {
      const { result, applyPending, confirm, bulk } = setup();
      confirm.mockResolvedValueOnce(false);

      await act(async () => {
        await result.current.handleBulkApplyPending();
      });

      expect(applyPending).not.toHaveBeenCalled();
      expect(bulk.deselectAll).not.toHaveBeenCalled();
    });

    it('applies pending for every selected id and reports success', async () => {
      const bulk = buildBulk({ selectedIds: ['mov-1', 'mov-2'] });
      const movements = [mockMovement({ id: 'mov-1' }), mockMovement({ id: 'mov-2' })];
      const { result, applyPending, toast } = setup({ bulk, movements });

      await act(async () => {
        await result.current.handleBulkApplyPending();
      });

      expect(applyPending).toHaveBeenCalledTimes(2);
      expect(applyPending).toHaveBeenCalledWith('mov-1');
      expect(applyPending).toHaveBeenCalledWith('mov-2');
      expect(toast.success).toHaveBeenCalledWith('Applied 2 movements');
      expect(bulk.deselectAll).toHaveBeenCalled();
    });

    it('reports an aggregated partial-failure toast', async () => {
      const bulk = buildBulk({ selectedIds: ['mov-1', 'mov-2', 'mov-3'] });
      const movements = [
        mockMovement({ id: 'mov-1' }),
        mockMovement({ id: 'mov-2' }),
        mockMovement({ id: 'mov-3' }),
      ];
      const { result, applyPending, toast } = setup({ bulk, movements });
      applyPending
        .mockResolvedValueOnce(undefined) // mov-1: success
        .mockRejectedValueOnce(new Error('boom')) // mov-2: failure
        .mockResolvedValueOnce(undefined); // mov-3: success

      await act(async () => {
        await result.current.handleBulkApplyPending();
      });

      expect(toast.error).toHaveBeenCalledWith('2 applied, 1 failed');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('uses singular form when exactly one movement is processed', async () => {
      const { result, toast } = setup();

      await act(async () => {
        await result.current.handleBulkApplyPending();
      });

      expect(toast.success).toHaveBeenCalledWith('Applied 1 movement');
    });
  });

  describe('handleBulkMarkAsPending', () => {
    it('marks each selected movement as pending after confirmation', async () => {
      const bulk = buildBulk({ selectedIds: ['mov-1', 'mov-2'] });
      const movements = [mockMovement({ id: 'mov-1' }), mockMovement({ id: 'mov-2' })];
      const { result, markAsPending, toast } = setup({ bulk, movements });

      await act(async () => {
        await result.current.handleBulkMarkAsPending();
      });

      expect(markAsPending).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('Marked 2 movements');
    });

    it('does nothing when cancelled', async () => {
      const { result, markAsPending, confirm } = setup();
      confirm.mockResolvedValueOnce(false);

      await act(async () => {
        await result.current.handleBulkMarkAsPending();
      });

      expect(markAsPending).not.toHaveBeenCalled();
    });
  });

  describe('handleBulkDelete', () => {
    it('deletes each selected movement after confirmation', async () => {
      const bulk = buildBulk({ selectedIds: ['mov-1', 'mov-2'] });
      const movements = [mockMovement({ id: 'mov-1' }), mockMovement({ id: 'mov-2' })];
      const { result, deleteOp, toast } = setup({ bulk, movements });

      await act(async () => {
        await result.current.handleBulkDelete();
      });

      expect(deleteOp).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('Deleted 2 movements');
    });

    it('handles selected ids that are no longer in the visible movements list', async () => {
      // The hook computes sub-pocket invalidation via a movements lookup.
      // Selecting an id not present in `movements` should still process the
      // delete without throwing; the caches are simply invalidated less
      // aggressively (no sub-pockets / no reminders).
      const bulk = buildBulk({ selectedIds: ['unknown-id'] });
      const { result, deleteOp, toast } = setup({ bulk, movements: [] });

      await act(async () => {
        await result.current.handleBulkDelete();
      });

      expect(deleteOp).toHaveBeenCalledWith('unknown-id');
      expect(toast.success).toHaveBeenCalledWith('Deleted 1 movement');
    });

    it('does nothing when cancelled', async () => {
      const { result, deleteOp, confirm } = setup();
      confirm.mockResolvedValueOnce(false);

      await act(async () => {
        await result.current.handleBulkDelete();
      });

      expect(deleteOp).not.toHaveBeenCalled();
    });
  });

  describe('confirm dialog content', () => {
    it('passes a danger variant for delete', async () => {
      const { result, confirm } = setup();

      await act(async () => {
        await result.current.handleBulkDelete();
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Movements',
          variant: 'danger',
        }),
      );
    });

    it('passes a warning variant for mark-as-pending', async () => {
      const { result, confirm } = setup();

      await act(async () => {
        await result.current.handleBulkMarkAsPending();
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Mark as Pending',
          variant: 'warning',
        }),
      );
    });

    it('passes an info variant for apply-pending', async () => {
      const { result, confirm } = setup();

      await act(async () => {
        await result.current.handleBulkApplyPending();
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Apply Pending Movements',
          variant: 'info',
        }),
      );
    });
  });
});
