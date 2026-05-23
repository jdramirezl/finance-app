import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '../../test/testUtils';
import { useMovementRowActions } from '../actions/useMovementRowActions';
import type { UseMovementRowActionsParams } from '../actions/useMovementRowActions';
import type { Movement } from '../../types';

const movement = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'mov-1',
  type: 'EgresoNormal',
  accountId: 'acc-1',
  pocketId: 'pkt-1',
  amount: 100,
  notes: 'Coffee',
  displayedDate: '2025-03-15',
  createdAt: '2025-03-15T10:00:00.000Z',
  isPending: false,
  ...overrides,
});

describe('useMovementRowActions', () => {
  let deleteMovement: { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };
  let applyPendingMovement: { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };
  let confirm: ReturnType<typeof vi.fn>;
  let setError: ReturnType<typeof vi.fn>;
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    deleteMovement = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    applyPendingMovement = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    confirm = vi.fn();
    setError = vi.fn();
    toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  });

  const setup = (movements: Movement[] = [movement()]) => {
    const params: UseMovementRowActionsParams = {
      movements,
      mutations: {
        deleteMovement,
        applyPendingMovement,
      } as unknown as UseMovementRowActionsParams['mutations'],
      confirm,
      toast: toast as unknown as UseMovementRowActionsParams['toast'],
      setError,
    };
    return renderHook(() => useMovementRowActions(params));
  };

  it('returns the expected handlers and initial loading state', () => {
    const { result } = setup();
    expect(typeof result.current.handleDelete).toBe('function');
    expect(typeof result.current.handleApplyPending).toBe('function');
    expect(result.current.deletingId).toBeNull();
    expect(result.current.applyingId).toBeNull();
  });

  describe('handleDelete', () => {
    it('asks for confirmation including the movement note in the message', async () => {
      confirm.mockResolvedValue(false);
      const { result } = setup([movement({ id: 'mov-1', notes: 'Netflix' })]);

      await act(async () => {
        await result.current.handleDelete('mov-1');
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Movement',
          message: expect.stringContaining('Netflix'),
          variant: 'danger',
        })
      );
    });

    it('does not call the mutation when the user cancels', async () => {
      confirm.mockResolvedValue(false);
      const { result } = setup();

      await act(async () => {
        await result.current.handleDelete('mov-1');
      });

      expect(deleteMovement.mutateAsync).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(setError).not.toHaveBeenCalled();
    });

    it('calls the mutation, clears prior error, and toasts on success', async () => {
      confirm.mockResolvedValue(true);
      const { result } = setup();

      await act(async () => {
        await result.current.handleDelete('mov-1');
      });

      expect(setError).toHaveBeenCalledWith(null);
      expect(deleteMovement.mutateAsync).toHaveBeenCalledWith('mov-1');
      expect(toast.success).toHaveBeenCalledWith('Movement deleted successfully!');
    });

    it('resets deletingId to null after success', async () => {
      confirm.mockResolvedValue(true);
      const { result } = setup();

      await act(async () => {
        await result.current.handleDelete('mov-1');
      });

      expect(result.current.deletingId).toBeNull();
    });

    it('forwards the mutation error message to setError and does not toast success', async () => {
      confirm.mockResolvedValue(true);
      deleteMovement.mutateAsync.mockRejectedValueOnce(new Error('boom'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleDelete('mov-1');
      });

      expect(setError).toHaveBeenCalledWith('boom');
      expect(toast.success).not.toHaveBeenCalled();
      expect(result.current.deletingId).toBeNull();
    });

    it('uses a fallback error message for non-Error rejections', async () => {
      confirm.mockResolvedValue(true);
      deleteMovement.mutateAsync.mockRejectedValueOnce('string-error');
      const { result } = setup();

      await act(async () => {
        await result.current.handleDelete('mov-1');
      });

      expect(setError).toHaveBeenCalledWith('Failed to delete movement');
    });
  });

  describe('handleApplyPending', () => {
    it('asks for confirmation with an info variant and includes the note', async () => {
      confirm.mockResolvedValue(false);
      const { result } = setup([movement({ id: 'mov-1', notes: 'Rent' })]);

      await act(async () => {
        await result.current.handleApplyPending('mov-1');
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Apply Pending Movement',
          message: expect.stringContaining('Rent'),
          variant: 'info',
        })
      );
    });

    it('does not call the mutation when cancelled', async () => {
      confirm.mockResolvedValue(false);
      const { result } = setup();

      await act(async () => {
        await result.current.handleApplyPending('mov-1');
      });

      expect(applyPendingMovement.mutateAsync).not.toHaveBeenCalled();
    });

    it('calls the mutation and toasts on success', async () => {
      confirm.mockResolvedValue(true);
      const { result } = setup();

      await act(async () => {
        await result.current.handleApplyPending('mov-1');
      });

      expect(setError).toHaveBeenCalledWith(null);
      expect(applyPendingMovement.mutateAsync).toHaveBeenCalledWith('mov-1');
      expect(toast.success).toHaveBeenCalledWith('Movement applied successfully!');
      expect(result.current.applyingId).toBeNull();
    });

    it('forwards mutation errors via setError', async () => {
      confirm.mockResolvedValue(true);
      applyPendingMovement.mutateAsync.mockRejectedValueOnce(new Error('apply failed'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleApplyPending('mov-1');
      });

      expect(setError).toHaveBeenCalledWith('apply failed');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('uses a fallback message for non-Error rejections', async () => {
      confirm.mockResolvedValue(true);
      applyPendingMovement.mutateAsync.mockRejectedValueOnce({ unexpected: true });
      const { result } = setup();

      await act(async () => {
        await result.current.handleApplyPending('mov-1');
      });

      expect(setError).toHaveBeenCalledWith('Failed to apply movement');
    });
  });
});
