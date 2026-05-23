import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '../../test/testUtils';
import { usePocketActions } from '../actions/usePocketActions';
import type { UsePocketActionsParams } from '../actions/usePocketActions';
import { mockAccounts, mockPockets } from '../../test/mockData';

const makeMutation = <T = unknown>(value?: T) => ({
  mutateAsync: vi.fn().mockResolvedValue(value),
  isPending: false,
});

describe('usePocketActions', () => {
  let createPocket: ReturnType<typeof makeMutation>;
  let updatePocket: ReturnType<typeof makeMutation>;
  let deletePocket: ReturnType<typeof makeMutation>;
  let migrateFixedPocketToAccount: ReturnType<typeof makeMutation>;
  let confirm: ReturnType<typeof vi.fn>;
  let setError: ReturnType<typeof vi.fn>;
  let closePocketForm: ReturnType<typeof vi.fn>;
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    createPocket = makeMutation();
    updatePocket = makeMutation();
    deletePocket = makeMutation();
    migrateFixedPocketToAccount = makeMutation();
    confirm = vi.fn();
    setError = vi.fn();
    closePocketForm = vi.fn();
    toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  });

  const setup = (overrides: Partial<UsePocketActionsParams> = {}) => {
    const params: UsePocketActionsParams = {
      accounts: mockAccounts,
      pockets: mockPockets,
      selectedAccountId: 'acc-1',
      mutations: {
        createPocket,
        updatePocket,
        deletePocket,
        migrateFixedPocketToAccount,
      } as unknown as UsePocketActionsParams['mutations'],
      confirm,
      toast: toast as unknown as UsePocketActionsParams['toast'],
      setError,
      closePocketForm,
      ...overrides,
    };
    return renderHook(() => usePocketActions(params));
  };

  describe('handleCreatePocket', () => {
    it('does nothing when no account is selected', async () => {
      const { result } = setup({ selectedAccountId: null });

      await act(async () => {
        await result.current.handleCreatePocket({ name: 'Travel', type: 'normal' });
      });

      expect(createPocket.mutateAsync).not.toHaveBeenCalled();
      expect(closePocketForm).not.toHaveBeenCalled();
    });

    it('creates a pocket with type normal by default', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleCreatePocket({ name: 'Travel', type: undefined as unknown as 'normal' });
      });

      expect(createPocket.mutateAsync).toHaveBeenCalledWith({
        accountId: 'acc-1',
        name: 'Travel',
        type: 'normal',
      });
      expect(toast.success).toHaveBeenCalledWith('Pocket created successfully!');
      expect(closePocketForm).toHaveBeenCalled();
      expect(setError).toHaveBeenCalledWith(null);
    });

    it('forwards the explicit pocket type', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleCreatePocket({ name: 'Bills', type: 'fixed' });
      });

      expect(createPocket.mutateAsync).toHaveBeenCalledWith({
        accountId: 'acc-1',
        name: 'Bills',
        type: 'fixed',
      });
    });

    it('forwards mutation errors via setError without closing the form', async () => {
      createPocket.mutateAsync.mockRejectedValueOnce(new Error('dup'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleCreatePocket({ name: 'Travel', type: 'normal' });
      });

      expect(setError).toHaveBeenCalledWith('dup');
      expect(closePocketForm).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdatePocket', () => {
    it('updates the pocket name and closes the form on success', async () => {
      const { result } = setup();
      const pocket = mockPockets[0];

      await act(async () => {
        await result.current.handleUpdatePocket(pocket, { name: 'Renamed', type: 'normal' });
      });

      expect(updatePocket.mutateAsync).toHaveBeenCalledWith({
        id: pocket.id,
        updates: { name: 'Renamed' },
      });
      expect(toast.success).toHaveBeenCalledWith('Pocket updated successfully!');
      expect(closePocketForm).toHaveBeenCalled();
    });

    it('forwards mutation errors via setError without closing the form', async () => {
      updatePocket.mutateAsync.mockRejectedValueOnce(new Error('nope'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleUpdatePocket(mockPockets[0], { name: 'X', type: 'normal' });
      });

      expect(setError).toHaveBeenCalledWith('nope');
      expect(closePocketForm).not.toHaveBeenCalled();
    });
  });

  describe('handleDeletePocket', () => {
    it('asks for confirmation with the pocket name and danger variant', async () => {
      confirm.mockResolvedValue(false);
      const { result } = setup();

      await act(async () => {
        await result.current.handleDeletePocket(mockPockets[0].id);
      });

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Pocket',
          message: expect.stringContaining(mockPockets[0].name),
          variant: 'danger',
        })
      );
    });

    it('does not delete when the user cancels', async () => {
      confirm.mockResolvedValue(false);
      const { result } = setup();

      await act(async () => {
        await result.current.handleDeletePocket(mockPockets[0].id);
      });

      expect(deletePocket.mutateAsync).not.toHaveBeenCalled();
    });

    it('deletes and toasts success on confirmation', async () => {
      confirm.mockResolvedValue(true);
      const { result } = setup();

      await act(async () => {
        await result.current.handleDeletePocket(mockPockets[0].id);
      });

      expect(deletePocket.mutateAsync).toHaveBeenCalledWith(mockPockets[0].id);
      expect(toast.success).toHaveBeenCalledWith('Pocket deleted successfully!');
    });

    it('forwards mutation errors via setError', async () => {
      confirm.mockResolvedValue(true);
      deletePocket.mutateAsync.mockRejectedValueOnce(new Error('boom'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleDeletePocket(mockPockets[0].id);
      });

      expect(setError).toHaveBeenCalledWith('boom');
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('isPocketFormSaving', () => {
    it('reflects createPocket pending state', () => {
      createPocket.isPending = true;
      const { result } = setup();
      expect(result.current.isPocketFormSaving).toBe(true);
    });

    it('reflects updatePocket pending state', () => {
      updatePocket.isPending = true;
      const { result } = setup();
      expect(result.current.isPocketFormSaving).toBe(true);
    });

    it('is false when neither mutation is pending', () => {
      const { result } = setup();
      expect(result.current.isPocketFormSaving).toBe(false);
    });
  });

  describe('migration controller', () => {
    it('starts closed with no selection', () => {
      const { result } = setup();
      expect(result.current.migration.isOpen).toBe(false);
      expect(result.current.migration.pocketId).toBeNull();
      expect(result.current.migration.targetAccountId).toBe('');
      expect(result.current.migration.isMigrating).toBe(false);
    });

    it('open() seeds the pocket id and resets the target account', () => {
      const { result } = setup();

      act(() => {
        result.current.migration.setTargetAccountId('stale');
      });
      expect(result.current.migration.targetAccountId).toBe('stale');

      act(() => {
        result.current.migration.open(mockPockets[1].id);
      });

      expect(result.current.migration.isOpen).toBe(true);
      expect(result.current.migration.pocketId).toBe(mockPockets[1].id);
      expect(result.current.migration.targetAccountId).toBe('');
    });

    it('close() clears state', () => {
      const { result } = setup();

      act(() => {
        result.current.migration.open(mockPockets[1].id);
        result.current.migration.setTargetAccountId('acc-2');
      });

      act(() => {
        result.current.migration.close();
      });

      expect(result.current.migration.isOpen).toBe(false);
      expect(result.current.migration.pocketId).toBeNull();
      expect(result.current.migration.targetAccountId).toBe('');
    });

    it('confirm() does nothing when nothing is selected', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.migration.confirm();
      });

      expect(migrateFixedPocketToAccount.mutateAsync).not.toHaveBeenCalled();
    });

    it('confirm() does nothing when no target account is set', async () => {
      const { result } = setup();
      act(() => {
        result.current.migration.open(mockPockets[1].id);
      });

      await act(async () => {
        await result.current.migration.confirm();
      });

      expect(migrateFixedPocketToAccount.mutateAsync).not.toHaveBeenCalled();
    });

    it('confirm() migrates, toasts with both names, and closes the dialog on success', async () => {
      const { result } = setup();

      act(() => {
        result.current.migration.open(mockPockets[1].id);
        result.current.migration.setTargetAccountId('acc-2');
      });

      await act(async () => {
        await result.current.migration.confirm();
      });

      expect(migrateFixedPocketToAccount.mutateAsync).toHaveBeenCalledWith({
        pocketId: mockPockets[1].id,
        targetAccountId: 'acc-2',
      });
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(mockPockets[1].name)
      );
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Cash'));
      expect(result.current.migration.isOpen).toBe(false);
      expect(result.current.migration.pocketId).toBeNull();
      expect(result.current.migration.targetAccountId).toBe('');
      expect(result.current.migration.isMigrating).toBe(false);
    });

    it('confirm() forwards errors via setError and keeps the dialog open', async () => {
      migrateFixedPocketToAccount.mutateAsync.mockRejectedValueOnce(new Error('nope'));
      const { result } = setup();

      act(() => {
        result.current.migration.open(mockPockets[1].id);
        result.current.migration.setTargetAccountId('acc-2');
      });

      await act(async () => {
        await result.current.migration.confirm();
      });

      expect(setError).toHaveBeenCalledWith('nope');
      expect(toast.success).not.toHaveBeenCalled();
      expect(result.current.migration.isOpen).toBe(true);
      expect(result.current.migration.isMigrating).toBe(false);
    });
  });
});
