import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrphanedRestore } from '../useOrphanedRestore';
import type { UseOrphanedRestoreParams } from '../useOrphanedRestore';

/**
 * Tests for {@link useOrphanedRestore}. The hook coordinates the
 * restore-orphaned-movements modal:
 *   - `open` populates `modalState` with the ids and the source label.
 *   - `close` clears state, unless the mutation is mid-flight (then it
 *     no-ops to prevent the modal from disappearing on the user).
 *   - `confirmRestore` calls the mutation, picks the right toast based
 *     on the partial-success counts, and clears state on success.
 *   - When the mutation throws, the hook swallows it (the mutation's
 *     own onError shows the error toast).
 */

type ToastMock = UseOrphanedRestoreParams['toast'];

const makeToast = (): ToastMock =>
  ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  } as unknown as ToastMock);

interface RestoreMutationStub {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}

const makeMutation = (overrides: Partial<RestoreMutationStub> = {}): RestoreMutationStub => ({
  mutateAsync: vi.fn(),
  isPending: false,
  ...overrides,
});

const setup = (
  overrides: { restoreMutation?: RestoreMutationStub; toast?: ToastMock } = {},
) => {
  const restoreMutation = overrides.restoreMutation ?? makeMutation();
  const toast = overrides.toast ?? makeToast();
  const { result, rerender } = renderHook(
    (params: UseOrphanedRestoreParams) => useOrphanedRestore(params),
    {
      initialProps: {
        restoreMutation: restoreMutation as unknown as UseOrphanedRestoreParams['restoreMutation'],
        toast,
      },
    },
  );
  return { result, rerender, restoreMutation, toast };
};

describe('useOrphanedRestore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with the modal closed and no movement ids', () => {
      const { result } = setup();

      expect(result.current.modalState).toEqual({
        isOpen: false,
        movementIds: [],
        sourceLabel: '',
      });
      expect(result.current.isSubmitting).toBe(false);
    });

    it('mirrors `restoreMutation.isPending` via `isSubmitting`', () => {
      const { result } = setup({ restoreMutation: makeMutation({ isPending: true }) });

      expect(result.current.isSubmitting).toBe(true);
    });
  });

  describe('open', () => {
    it('populates modalState with the movement ids and source label', () => {
      const { result } = setup();

      act(() => {
        result.current.open({
          movementIds: ['mov-1', 'mov-2'],
          sourceLabel: 'Old Checking',
        });
      });

      expect(result.current.modalState).toEqual({
        isOpen: true,
        movementIds: ['mov-1', 'mov-2'],
        sourceLabel: 'Old Checking',
      });
    });
  });

  describe('close', () => {
    it('clears modalState when the mutation is idle', () => {
      const { result } = setup();

      act(() => {
        result.current.open({ movementIds: ['mov-1'], sourceLabel: 'Old' });
      });
      act(() => {
        result.current.close();
      });

      expect(result.current.modalState).toEqual({
        isOpen: false,
        movementIds: [],
        sourceLabel: '',
      });
    });

    it('is a no-op while the mutation is pending (prevents flicker)', () => {
      const restoreMutation = makeMutation({ isPending: true });
      const { result } = setup({ restoreMutation });

      act(() => {
        result.current.open({ movementIds: ['mov-1'], sourceLabel: 'Old' });
      });
      act(() => {
        result.current.close();
      });

      expect(result.current.modalState.isOpen).toBe(true);
      expect(result.current.modalState.movementIds).toEqual(['mov-1']);
    });
  });

  describe('confirmRestore', () => {
    it('forwards movement ids, account id, and pocket id to the mutation', async () => {
      const restoreMutation = makeMutation({
        mutateAsync: vi.fn().mockResolvedValue({ restored: 2, failed: 0 }),
      });
      const { result } = setup({ restoreMutation });

      act(() => {
        result.current.open({
          movementIds: ['mov-1', 'mov-2'],
          sourceLabel: 'Old Checking',
        });
      });
      await act(async () => {
        await result.current.confirmRestore('acc-target', 'pkt-target');
      });

      expect(restoreMutation.mutateAsync).toHaveBeenCalledWith({
        movementIds: ['mov-1', 'mov-2'],
        accountId: 'acc-target',
        pocketId: 'pkt-target',
      });
    });

    it('shows a singular success toast when exactly one movement is restored', async () => {
      const restoreMutation = makeMutation({
        mutateAsync: vi.fn().mockResolvedValue({ restored: 1, failed: 0 }),
      });
      const { result, toast } = setup({ restoreMutation });

      act(() => {
        result.current.open({ movementIds: ['mov-1'], sourceLabel: 'Old' });
      });
      await act(async () => {
        await result.current.confirmRestore('acc-1', 'pkt-1');
      });

      expect(toast.success).toHaveBeenCalledWith('Restored 1 movement');
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it('shows a plural success toast when more than one movement is restored', async () => {
      const restoreMutation = makeMutation({
        mutateAsync: vi.fn().mockResolvedValue({ restored: 3, failed: 0 }),
      });
      const { result, toast } = setup({ restoreMutation });

      act(() => {
        result.current.open({
          movementIds: ['mov-1', 'mov-2', 'mov-3'],
          sourceLabel: 'Old',
        });
      });
      await act(async () => {
        await result.current.confirmRestore('acc-1', 'pkt-1');
      });

      expect(toast.success).toHaveBeenCalledWith('Restored 3 movements');
    });

    it('shows a warning toast on partial success', async () => {
      const restoreMutation = makeMutation({
        mutateAsync: vi.fn().mockResolvedValue({ restored: 2, failed: 1 }),
      });
      const { result, toast } = setup({ restoreMutation });

      act(() => {
        result.current.open({
          movementIds: ['mov-1', 'mov-2', 'mov-3'],
          sourceLabel: 'Old',
        });
      });
      await act(async () => {
        await result.current.confirmRestore('acc-1', 'pkt-1');
      });

      expect(toast.warning).toHaveBeenCalledWith('Restored 2 movement(s), 1 failed');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('falls back to the requested count when the result omits restored/failed', async () => {
      const restoreMutation = makeMutation({
        // Some implementations resolve with `undefined` — the hook should
        // treat that as "all requested ids restored, none failed".
        mutateAsync: vi.fn().mockResolvedValue(undefined),
      });
      const { result, toast } = setup({ restoreMutation });

      act(() => {
        result.current.open({
          movementIds: ['mov-1', 'mov-2'],
          sourceLabel: 'Old',
        });
      });
      await act(async () => {
        await result.current.confirmRestore('acc-1', 'pkt-1');
      });

      expect(toast.success).toHaveBeenCalledWith('Restored 2 movements');
    });

    it('clears modalState after a successful restore', async () => {
      const restoreMutation = makeMutation({
        mutateAsync: vi.fn().mockResolvedValue({ restored: 1, failed: 0 }),
      });
      const { result } = setup({ restoreMutation });

      act(() => {
        result.current.open({ movementIds: ['mov-1'], sourceLabel: 'Old' });
      });
      await act(async () => {
        await result.current.confirmRestore('acc-1', 'pkt-1');
      });

      expect(result.current.modalState).toEqual({
        isOpen: false,
        movementIds: [],
        sourceLabel: '',
      });
    });

    it('swallows mutation errors and does not toast (mutation owns the error toast)', async () => {
      const restoreMutation = makeMutation({
        mutateAsync: vi.fn().mockRejectedValue(new Error('network down')),
      });
      const { result, toast } = setup({ restoreMutation });

      act(() => {
        result.current.open({ movementIds: ['mov-1'], sourceLabel: 'Old' });
      });
      await act(async () => {
        // Importantly: the call must not throw.
        await result.current.confirmRestore('acc-1', 'pkt-1');
      });

      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      // Modal stays open so the user can retry from the same dialog.
      expect(result.current.modalState.isOpen).toBe(true);
    });
  });
});
