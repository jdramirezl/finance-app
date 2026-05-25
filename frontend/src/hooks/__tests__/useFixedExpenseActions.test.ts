import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFixedExpenseActions } from '../actions/useFixedExpenseActions';
import type { UseFixedExpenseActionsParams } from '../actions/useFixedExpenseActions';
import type { FixedExpenseGroup, SubPocket } from '../../types';

const mockSubPocket = (overrides: Partial<SubPocket> = {}): SubPocket => ({
  id: 'sub-1',
  pocketId: 'pkt-fixed',
  name: 'Internet',
  valueTotal: 1200,
  periodicityMonths: 12,
  balance: 0,
  ...overrides,
});

const mockGroup = (overrides: Partial<FixedExpenseGroup> = {}): FixedExpenseGroup => ({
  id: 'grp-1',
  name: 'Utilities',
  color: '#3B82F6',
  displayOrder: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

interface MutationStub {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}

const buildParams = (overrides: Partial<UseFixedExpenseActionsParams> = {}) => {
  const deleteFixedExpenseGroup: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  const reorderFixedExpenseGroups: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

  const deleteSubPocket: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  const moveSubPocketToGroup: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
  const confirm = vi.fn().mockResolvedValue(true);

  const params: UseFixedExpenseActionsParams = {
    fixedSubPockets: [mockSubPocket()],
    groupMutations: {
      deleteFixedExpenseGroup,
      reorderFixedExpenseGroups,
    } as unknown as UseFixedExpenseActionsParams['groupMutations'],
    subPocketMutations: {
      deleteSubPocket,
      moveSubPocketToGroup,
    } as unknown as UseFixedExpenseActionsParams['subPocketMutations'],
    toast: toast as unknown as UseFixedExpenseActionsParams['toast'],
    confirm: confirm as unknown as UseFixedExpenseActionsParams['confirm'],
    ...overrides,
  };

  return {
    params,
    deleteFixedExpenseGroup,
    reorderFixedExpenseGroups,
    deleteSubPocket,
    moveSubPocketToGroup,
    toast,
    confirm,
  };
};

describe('useFixedExpenseActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleDeleteSubPocket', () => {
    it('deletes the sub-pocket when confirmed', async () => {
      const { params, deleteSubPocket, toast } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      await act(async () => {
        await result.current.handleDeleteSubPocket('sub-1');
      });

      expect(deleteSubPocket.mutateAsync).toHaveBeenCalledWith('sub-1');
      expect(toast.success).toHaveBeenCalledWith('Fixed expense deleted successfully!');
    });

    it('skips deletion when cancelled', async () => {
      const { params, deleteSubPocket, confirm } = buildParams();
      confirm.mockResolvedValueOnce(false);
      const { result } = renderHook(() => useFixedExpenseActions(params));

      await act(async () => {
        await result.current.handleDeleteSubPocket('sub-1');
      });

      expect(deleteSubPocket.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleMoveToGroup', () => {
    it('moves the sub-pocket to the requested group', async () => {
      const { params, moveSubPocketToGroup, toast } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      await act(async () => {
        await result.current.handleMoveToGroup('sub-1', 'grp-2');
      });

      expect(moveSubPocketToGroup.mutateAsync).toHaveBeenCalledWith({
        subPocketId: 'sub-1',
        groupId: 'grp-2',
      });
      expect(toast.success).toHaveBeenCalledWith('Expense moved to new group!');
    });
  });

  describe('handleDeleteGroup', () => {
    it('deletes the group when confirmed', async () => {
      const { params, deleteFixedExpenseGroup, toast } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      await act(async () => {
        await result.current.handleDeleteGroup(mockGroup());
      });

      expect(deleteFixedExpenseGroup.mutateAsync).toHaveBeenCalledWith('grp-1');
      expect(toast.success).toHaveBeenCalledWith('Group deleted successfully!');
    });

    it('does nothing when cancelled', async () => {
      const { params, deleteFixedExpenseGroup, confirm } = buildParams();
      confirm.mockResolvedValueOnce(false);
      const { result } = renderHook(() => useFixedExpenseActions(params));

      await act(async () => {
        await result.current.handleDeleteGroup(mockGroup());
      });

      expect(deleteFixedExpenseGroup.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleReorderGroups', () => {
    it('passes the ordered ids to the mutation', async () => {
      const { params, reorderFixedExpenseGroups } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      await act(async () => {
        await result.current.handleReorderGroups([
          mockGroup({ id: 'g-3' }),
          mockGroup({ id: 'g-1' }),
          mockGroup({ id: 'g-2' }),
        ]);
      });

      expect(reorderFixedExpenseGroups.mutateAsync).toHaveBeenCalledWith(['g-3', 'g-1', 'g-2']);
    });
  });

  describe('toggleGroupCollapse', () => {
    it('adds and removes group ids from the collapsed set', () => {
      const { params } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      act(() => result.current.toggleGroupCollapse('grp-1'));
      expect(result.current.collapsedGroups.has('grp-1')).toBe(true);

      act(() => result.current.toggleGroupCollapse('grp-1'));
      expect(result.current.collapsedGroups.has('grp-1')).toBe(false);
    });
  });
});
