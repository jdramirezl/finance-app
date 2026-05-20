import { useState } from 'react';
import { accountService } from '../services/accountService';
import { movementService } from '../services/movementService';
import { pocketService } from '../services/pocketService';
import { subPocketService } from '../services/subPocketService';
import type {
  AccountCardDisplayMode,
  AccountCardDisplaySettings,
  Currency,
  Settings,
  SnapshotFrequency,
} from '../types';
import type { useToast } from './useToast';
import type { useUpdateSettings } from './mutations';

const BUDGET_PLANNING_KEY = 'finance_app_budget_planning';

const readBudgetPlanning = (): unknown => {
  try {
    const item = localStorage.getItem(BUDGET_PLANNING_KEY);
    return item
      ? JSON.parse(item)
      : { initialAmount: 0, distributionEntries: [] };
  } catch (error) {
    console.error('Error reading budget planning from localStorage:', error);
    return { initialAmount: 0, distributionEntries: [] };
  }
};

const DEFAULT_DISPLAY: AccountCardDisplaySettings = {
  normal: 'detailed',
  investment: 'detailed',
  cd: 'detailed',
};

type AccountKind = keyof AccountCardDisplaySettings;

export interface UseSettingsActionsParams {
  settings: Settings | undefined;
  updateMutation: ReturnType<typeof useUpdateSettings>;
  toast: ReturnType<typeof useToast.getState>;
}

export interface UseSettingsActionsResult {
  isExporting: boolean;
  handleExport: () => Promise<void>;
  handleCurrencyChange: (currency: Currency) => Promise<void>;
  handleDisplayChange: (
    kind: AccountKind,
    mode: AccountCardDisplayMode
  ) => Promise<void>;
  handleSnapshotFrequencyChange: (frequency: SnapshotFrequency) => Promise<void>;
}

/**
 * Encapsulates the imperative side of the Settings page: dispatching the
 * settings update mutation for individual fields, and assembling the JSON
 * backup. Settings are required for the change handlers to do anything; the
 * page guards on `settings` before rendering, so the no-op branches are
 * defensive only.
 */
export const useSettingsActions = ({
  settings,
  updateMutation,
  toast,
}: UseSettingsActionsParams): UseSettingsActionsResult => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const accounts = await accountService.getAllAccounts();
      const pockets = await pocketService.getAllPockets();
      const subPockets = await subPocketService.getAllSubPockets();
      const movements = await movementService.getAllMovements();
      const budgetPlanning = readBudgetPlanning();

      const exportData = {
        meta: {
          version: '1.0',
          exportDate: new Date().toISOString(),
          app: 'FinanceApp',
        },
        settings,
        accounts,
        pockets,
        subPockets,
        movements,
        budgetPlanning,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance_app_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        `Exported ${movements.length} movements and all data successfully`
      );
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCurrencyChange = async (currency: Currency) => {
    if (!settings) return;
    try {
      await updateMutation.mutateAsync({ ...settings, primaryCurrency: currency });
    } catch (err) {
      console.error('Failed to update settings:', err);
      toast.error('Failed to update currency');
    }
  };

  const handleDisplayChange = async (
    kind: AccountKind,
    mode: AccountCardDisplayMode
  ) => {
    if (!settings) return;
    try {
      const current = settings.accountCardDisplay || DEFAULT_DISPLAY;
      await updateMutation.mutateAsync({
        ...settings,
        accountCardDisplay: { ...current, [kind]: mode },
      });
      toast.success(`${kind} account display updated to ${mode}`);
    } catch (err) {
      console.error('Failed to update account display:', err);
      toast.error('Failed to update account display');
    }
  };

  const handleSnapshotFrequencyChange = async (frequency: SnapshotFrequency) => {
    if (!settings) return;
    try {
      await updateMutation.mutateAsync({
        ...settings,
        snapshotFrequency: frequency,
      });
      toast.success(`Snapshot frequency updated to ${frequency}`);
    } catch (err) {
      console.error('Failed to update snapshot frequency:', err);
      toast.error('Failed to update snapshot frequency');
    }
  };

  return {
    isExporting,
    handleExport,
    handleCurrencyChange,
    handleDisplayChange,
    handleSnapshotFrequencyChange,
  };
};
