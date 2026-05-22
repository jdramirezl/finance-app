import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '../../test/testUtils';

// Mock the data services that the export flow pulls from. Hoisted via
// vi.mock so the spies are wired before the hook (and its imports) load.
vi.mock('../../services/accountService', () => ({
  accountService: { getAllAccounts: vi.fn() },
}));
vi.mock('../../services/pocketService', () => ({
  pocketService: { getAllPockets: vi.fn() },
}));
vi.mock('../../services/subPocketService', () => ({
  subPocketService: { getAllSubPockets: vi.fn() },
}));
vi.mock('../../services/movementService', () => ({
  movementService: { getAllMovements: vi.fn() },
}));

import { useSettingsActions } from '../actions/useSettingsActions';
import type { UseSettingsActionsParams } from '../actions/useSettingsActions';
import type { Settings } from '../../types';
import { accountService } from '../../services/accountService';
import { pocketService } from '../../services/pocketService';
import { subPocketService } from '../../services/subPocketService';
import { movementService } from '../../services/movementService';

const baseSettings: Settings = {
  primaryCurrency: 'USD',
  dateFormat: 'MM/dd/yyyy',
  movementsPerPage: 20,
  reminderAdvanceDays: 7,
  defaultCurrencyForNewAccounts: 'USD',
};

describe('useSettingsActions', () => {
  let updateMutation: { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    updateMutation = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  });

  const setup = (settings: Settings | null = baseSettings) => {
    // null is the explicit "no settings yet" sentinel — using `undefined`
    // would collide with TypeScript's default-parameter semantics.
    const params: UseSettingsActionsParams = {
      settings: settings === null ? undefined : settings,
      updateMutation: updateMutation as unknown as UseSettingsActionsParams['updateMutation'],
      toast: toast as unknown as UseSettingsActionsParams['toast'],
    };
    return renderHook(() => useSettingsActions(params));
  };

  it('exposes all expected handlers and an initial isExporting=false', () => {
    const { result } = setup();
    expect(result.current.isExporting).toBe(false);
    expect(typeof result.current.handleExport).toBe('function');
    expect(typeof result.current.handleCurrencyChange).toBe('function');
    expect(typeof result.current.handleDisplayChange).toBe('function');
    expect(typeof result.current.handleSnapshotFrequencyChange).toBe('function');
    expect(typeof result.current.handleDefaultExpenseChange).toBe('function');
    expect(typeof result.current.handleDefaultIncomeChange).toBe('function');
    expect(typeof result.current.handleDateFormatChange).toBe('function');
    expect(typeof result.current.handleMovementsPerPageChange).toBe('function');
    expect(typeof result.current.handleReminderAdvanceDaysChange).toBe('function');
    expect(typeof result.current.handleDefaultCurrencyChange).toBe('function');
  });

  describe('handleExport', () => {
    const mockBackup = () => {
      vi.mocked(accountService.getAllAccounts).mockResolvedValue([{ id: 'a' } as never]);
      vi.mocked(pocketService.getAllPockets).mockResolvedValue([{ id: 'p' } as never]);
      vi.mocked(subPocketService.getAllSubPockets).mockResolvedValue([{ id: 'sp' } as never]);
      vi.mocked(movementService.getAllMovements).mockResolvedValue([
        { id: 'm-1' } as never,
        { id: 'm-2' } as never,
      ]);
    };

    beforeEach(() => {
      // JSDOM does not implement URL.createObjectURL / revokeObjectURL or
      // anchor-tag downloads. Stub them so the export flow doesn't print
      // a "navigation not implemented" warning.
      Object.defineProperty(window.URL, 'createObjectURL', {
        value: vi.fn(() => 'blob:fake'),
        configurable: true,
      });
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        value: vi.fn(),
        configurable: true,
      });
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    it('pulls all data and toasts success with the movement count', async () => {
      mockBackup();
      const { result } = setup();

      await act(async () => {
        await result.current.handleExport();
      });

      expect(accountService.getAllAccounts).toHaveBeenCalled();
      expect(pocketService.getAllPockets).toHaveBeenCalled();
      expect(subPocketService.getAllSubPockets).toHaveBeenCalled();
      expect(movementService.getAllMovements).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('2 movements')
      );
      expect(result.current.isExporting).toBe(false);
    });

    it('toasts an error when any service rejects', async () => {
      mockBackup();
      vi.mocked(accountService.getAllAccounts).mockRejectedValueOnce(new Error('db down'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleExport();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to export data');
      expect(toast.success).not.toHaveBeenCalled();
      expect(result.current.isExporting).toBe(false);
    });
  });

  describe('settings change handlers', () => {
    it('handleCurrencyChange merges primaryCurrency into the existing settings', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleCurrencyChange('MXN');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        primaryCurrency: 'MXN',
      });
    });

    it('handleCurrencyChange is a no-op when settings are undefined', async () => {
      const { result } = setup(null);

      await act(async () => {
        await result.current.handleCurrencyChange('MXN');
      });

      expect(updateMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('handleDisplayChange seeds the default display map and updates the requested kind', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleDisplayChange('investment', 'compact');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        accountCardDisplay: {
          normal: 'detailed',
          investment: 'compact',
          cd: 'detailed',
        },
      });
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('compact')
      );
    });

    it('handleDisplayChange preserves existing accountCardDisplay overrides', async () => {
      const settingsWithDisplay: Settings = {
        ...baseSettings,
        accountCardDisplay: { normal: 'compact', investment: 'compact', cd: 'detailed' },
      };
      const { result } = setup(settingsWithDisplay);

      await act(async () => {
        await result.current.handleDisplayChange('cd', 'compact');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...settingsWithDisplay,
        accountCardDisplay: { normal: 'compact', investment: 'compact', cd: 'compact' },
      });
    });

    it('handleSnapshotFrequencyChange updates snapshotFrequency and toasts', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleSnapshotFrequencyChange('weekly');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        snapshotFrequency: 'weekly',
      });
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('weekly')
      );
    });

    it('handleDefaultExpenseChange sets account+pocket ids', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleDefaultExpenseChange('acc-1', 'pkt-1');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        defaultExpenseAccountId: 'acc-1',
        defaultExpensePocketId: 'pkt-1',
      });
    });

    it('handleDefaultExpenseChange clears ids when passed empty strings', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleDefaultExpenseChange('', '');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        defaultExpenseAccountId: undefined,
        defaultExpensePocketId: undefined,
      });
    });

    it('handleDefaultIncomeChange sets account+pocket ids', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleDefaultIncomeChange('acc-2', 'pkt-2');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        defaultIncomeAccountId: 'acc-2',
        defaultIncomePocketId: 'pkt-2',
      });
    });

    it('handleDateFormatChange updates dateFormat', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleDateFormatChange('yyyy-MM-dd');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        dateFormat: 'yyyy-MM-dd',
      });
    });

    it('handleMovementsPerPageChange updates movementsPerPage', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleMovementsPerPageChange(50);
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        movementsPerPage: 50,
      });
    });

    it('handleReminderAdvanceDaysChange updates reminderAdvanceDays', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleReminderAdvanceDaysChange(14);
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        reminderAdvanceDays: 14,
      });
    });

    it('handleDefaultCurrencyChange updates defaultCurrencyForNewAccounts', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleDefaultCurrencyChange('EUR');
      });

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        defaultCurrencyForNewAccounts: 'EUR',
      });
    });

    it('mutation rejection is swallowed so the UI can continue (mutation owns the toast)', async () => {
      updateMutation.mutateAsync.mockRejectedValueOnce(new Error('boom'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleCurrencyChange('MXN');
      });

      // No throw, no error-toast from this hook (the mutation's onError owns
      // user-facing error reporting).
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('every change handler short-circuits when settings is undefined', async () => {
      const { result } = setup(null);

      await act(async () => {
        await result.current.handleDisplayChange('normal', 'compact');
        await result.current.handleSnapshotFrequencyChange('daily');
        await result.current.handleDefaultExpenseChange('a', 'p');
        await result.current.handleDefaultIncomeChange('a', 'p');
        await result.current.handleDateFormatChange('yyyy-MM-dd');
        await result.current.handleMovementsPerPageChange(10);
        await result.current.handleReminderAdvanceDaysChange(3);
        await result.current.handleDefaultCurrencyChange('GBP');
      });

      expect(updateMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });
});
