import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFixedExpenseActions } from '../actions/useFixedExpenseActions';
import type { UseFixedExpenseActionsParams } from '../actions/useFixedExpenseActions';
import type { Account, FixedExpenseGroup, Pocket, SubPocket } from '../../types';

const mockAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Bank',
  color: '#3B82F6',
  currency: 'USD',
  balance: 1000,
  type: 'normal',
  ...overrides,
});

const mockFixedPocket = (overrides: Partial<Pocket> = {}): Pocket => ({
  id: 'pkt-fixed',
  accountId: 'acc-1',
  name: 'Fixed Expenses',
  type: 'fixed',
  balance: 0,
  currency: 'USD',
  ...overrides,
});

const mockSubPocket = (overrides: Partial<SubPocket> = {}): SubPocket => ({
  id: 'sub-1',
  pocketId: 'pkt-fixed',
  name: 'Internet',
  valueTotal: 1200,
  periodicityMonths: 12,
  balance: 0,
  enabled: true,
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
  const createMovement: MutationStub = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'mov-new' }),
    isPending: false,
  };

  const deleteFixedExpenseGroup: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  const toggleFixedExpenseGroup: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  const reorderFixedExpenseGroups: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

  const deleteSubPocket: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  const toggleSubPocketEnabled: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  const moveSubPocketToGroup: MutationStub = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
  const confirm = vi.fn().mockResolvedValue(true);

  const params: UseFixedExpenseActionsParams = {
    accounts: [mockAccount()],
    fixedPockets: [mockFixedPocket()],
    fixedSubPockets: [mockSubPocket()],
    movementMutations: { createMovement } as unknown as UseFixedExpenseActionsParams['movementMutations'],
    groupMutations: {
      deleteFixedExpenseGroup,
      toggleFixedExpenseGroup,
      reorderFixedExpenseGroups,
    } as unknown as UseFixedExpenseActionsParams['groupMutations'],
    subPocketMutations: {
      deleteSubPocket,
      toggleSubPocketEnabled,
      moveSubPocketToGroup,
    } as unknown as UseFixedExpenseActionsParams['subPocketMutations'],
    toast: toast as unknown as UseFixedExpenseActionsParams['toast'],
    confirm: confirm as unknown as UseFixedExpenseActionsParams['confirm'],
    ...overrides,
  };

  return {
    params,
    createMovement,
    deleteFixedExpenseGroup,
    toggleFixedExpenseGroup,
    reorderFixedExpenseGroups,
    deleteSubPocket,
    toggleSubPocketEnabled,
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

  describe('handleToggleSubPocket', () => {
    it('toggles the sub-pocket and reports success', async () => {
      const { params, toggleSubPocketEnabled, toast } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      await act(async () => {
        await result.current.handleToggleSubPocket('sub-1');
      });

      expect(toggleSubPocketEnabled.mutateAsync).toHaveBeenCalledWith('sub-1');
      expect(toast.success).toHaveBeenCalledWith('Fixed expense status updated!');
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

  describe('handleToggleGroup', () => {
    it('forwards id and enabled flag and toasts on success', async () => {
      const { params, toggleFixedExpenseGroup, toast } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      await act(async () => {
        await result.current.handleToggleGroup('grp-1', false);
      });

      expect(toggleFixedExpenseGroup.mutateAsync).toHaveBeenCalledWith({
        id: 'grp-1',
        enabled: false,
      });
      expect(toast.success).toHaveBeenCalledWith('Group disabled successfully!');
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

  describe('prepareBatchFromEnabled', () => {
    it('toasts an error when no fixed-expense pockets exist', () => {
      const { params, toast } = buildParams({ fixedPockets: [] });
      const { result } = renderHook(() => useFixedExpenseActions(params));

      act(() => result.current.prepareBatchFromEnabled());

      expect(toast.error).toHaveBeenCalledWith('No fixed expenses accounts found');
      expect(result.current.batchForm.isOpen).toBe(false);
    });

    it('toasts an error when no enabled expenses exist', () => {
      const { params, toast } = buildParams({
        fixedSubPockets: [mockSubPocket({ enabled: false })],
      });
      const { result } = renderHook(() => useFixedExpenseActions(params));

      act(() => result.current.prepareBatchFromEnabled());

      expect(toast.error).toHaveBeenCalledWith('No enabled fixed expenses found');
      expect(result.current.batchForm.isOpen).toBe(false);
    });

    it('builds rows for each enabled expense and opens the batch form', () => {
      const fixedSubPockets = [
        mockSubPocket({ id: 'sp-1', name: 'Internet', valueTotal: 1200, periodicityMonths: 12 }),
        mockSubPocket({ id: 'sp-2', name: 'Insurance', valueTotal: 600, periodicityMonths: 6 }),
        mockSubPocket({ id: 'sp-3', enabled: false }),
      ];

      const { params, toast } = buildParams({ fixedSubPockets });
      const { result } = renderHook(() => useFixedExpenseActions(params));

      act(() => result.current.prepareBatchFromEnabled());

      expect(result.current.batchForm.isOpen).toBe(true);
      expect(result.current.batchForm.rows).toHaveLength(2);

      const [row1, row2] = result.current.batchForm.rows;
      expect(row1).toMatchObject({
        type: 'IngresoFijo',
        accountId: 'acc-1',
        pocketId: 'pkt-fixed',
        subPocketId: 'sp-1',
        amount: '100.00',
      });
      expect(row2).toMatchObject({
        type: 'IngresoFijo',
        accountId: 'acc-1',
        pocketId: 'pkt-fixed',
        subPocketId: 'sp-2',
        amount: '100.00',
      });
      expect(toast.success).toHaveBeenCalledWith('Pre-populated 2 fixed expenses');
    });
  });

  describe('batchForm.save', () => {
    it('creates a movement per row and clears the batch on success', async () => {
      const { params, createMovement, toast } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      // Open the batch first by populating it from enabled expenses.
      act(() => result.current.prepareBatchFromEnabled());
      const rows = result.current.batchForm.rows;

      await act(async () => {
        await result.current.batchForm.save(rows);
      });

      expect(createMovement.mutateAsync).toHaveBeenCalledTimes(rows.length);
      expect(createMovement.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'IngresoFijo',
          accountId: 'acc-1',
          pocketId: 'pkt-fixed',
          subPocketId: 'sub-1',
          amount: 100,
          isPending: false,
        }),
      );
      expect(toast.success).toHaveBeenCalledWith(`Successfully created ${rows.length} movements!`);
      expect(result.current.batchForm.isOpen).toBe(false);
      expect(result.current.batchForm.rows).toEqual([]);
    });
  });

  describe('batchForm.open / close / setRows', () => {
    it('exposes manual controls for the batch form state', () => {
      const { params } = buildParams();
      const { result } = renderHook(() => useFixedExpenseActions(params));

      act(() => result.current.batchForm.open());
      expect(result.current.batchForm.isOpen).toBe(true);

      act(() =>
        result.current.batchForm.setRows([
          {
            id: 'r1',
            type: 'IngresoFijo',
            accountId: 'acc-1',
            pocketId: 'pkt-fixed',
            amount: '50',
            notes: '',
            displayedDate: '2025-06-15',
          },
        ]),
      );
      expect(result.current.batchForm.rows).toHaveLength(1);

      act(() => result.current.batchForm.close());
      expect(result.current.batchForm.isOpen).toBe(false);
      expect(result.current.batchForm.rows).toEqual([]);
    });
  });
});
