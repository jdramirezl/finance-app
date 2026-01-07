import { useState } from 'react';
import { useSettingsQuery } from '../hooks/queries';
import { useUpdateSettings } from '../hooks/mutations';
import { currencyService } from '../services/currencyService';
import { movementService } from '../services/movementService';
import { accountService } from '../services/accountService';
import { pocketService } from '../services/pocketService';
import { subPocketService } from '../services/subPocketService';
import { StorageService } from '../services/storageService';
import type { Currency } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { RefreshCw, Download } from 'lucide-react';
import { migrateOrphanedMovements } from '../utils/migrateOrphanedMovements';
import { useToast } from '../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import DebugStockPrice from '../components/settings/DebugStockPrice';
import DebugExchangeRate from '../components/settings/DebugExchangeRate';

const SettingsPage = () => {
  // TanStack Query hooks
  const { data: settings, isLoading } = useSettingsQuery();
  const updateSettingsMutation = useUpdateSettings();
  const queryClient = useQueryClient();

  const toast = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  const handleCurrencyChange = async (currency: Currency) => {
    if (!settings) return;

    try {
      currencyService.setPrimaryCurrency(currency);
      await updateSettingsMutation.mutateAsync({
        ...settings,
        primaryCurrency: currency
      });
    } catch (err) {
      console.error('Failed to update settings:', err);
      toast.error('Failed to update currency');
    }
  };

  const handleMigrateOrphans = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateOrphanedMovements();
      // Invalidate movements query to reload
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      toast.success(`Migration complete: ${result.marked} movements updated out of ${result.total} total`);
    } catch (err) {
      console.error('Migration failed:', err);
      toast.error('Failed to migrate orphaned movements');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRecalculateBalances = async () => {
    setIsRecalculating(true);
    try {
      await movementService.recalculateAllPocketBalances();
      await accountService.recalculateAllBalances();
      // Invalidate all queries to reload fresh data
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['pockets'] });
      queryClient.invalidateQueries({ queryKey: ['subPockets'] });
      toast.success('All balances recalculated successfully! Pending movements excluded.');
    } catch (err) {
      console.error('Recalculation failed:', err);
      toast.error('Failed to recalculate balances');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Fetch all data
      // Note: We access services directly to get fresh data
      const accounts = await accountService.getAllAccounts();
      const pockets = await pocketService.getAllPockets();
      const subPockets = await subPocketService.getAllSubPockets();
      const movements = await movementService.getAllMovements(); // This might need pagination handling if very large
      const budgetPlanning = StorageService.getBudgetPlanning();

      const exportData = {
        meta: {
          version: '1.0',
          exportDate: new Date().toISOString(),
          app: 'FinanceApp'
        },
        settings,
        accounts,
        pockets,
        subPockets,
        movements,
        budgetPlanning
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance_app_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${movements.length} movements and all data successfully`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  // Loading state
  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <Card className="max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Settings</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">Manage your application preferences and data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Left Column: General Preferences */}
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <span className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-5 h-5" />
              </span>
              General Preferences
            </h2>

            <Card className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Primary Currency</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select your primary currency for all total calculations.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {currencies.map((currency) => (
                    <label
                      key={currency}
                      className={`relative flex flex-col p-4 border rounded-xl cursor-pointer transition-all duration-200 ${settings.primaryCurrency === currency
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <input
                        type="radio"
                        name="primaryCurrency"
                        value={currency}
                        checked={settings.primaryCurrency === currency}
                        onChange={() => handleCurrencyChange(currency)}
                        className="sr-only"
                      />
                      <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{currency}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {settings.primaryCurrency === currency ? 'Active' : 'Select'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Account Card Display</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Choose how account cards appear on the summary page for each account type.
                </p>
                <div className="space-y-4">
                  {/* Normal Accounts */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Regular Accounts</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {(['compact', 'detailed'] as const).map((mode) => (
                        <label
                          key={`normal-${mode}`}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${(settings.accountCardDisplay?.normal || 'detailed') === mode
                            ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                          <input
                            type="radio"
                            name="normalAccountDisplay"
                            value={mode}
                            checked={(settings.accountCardDisplay?.normal || 'detailed') === mode}
                            onChange={async () => {
                              try {
                                const currentDisplay = settings.accountCardDisplay || { normal: 'detailed', investment: 'detailed', cd: 'detailed' };
                                await updateSettingsMutation.mutateAsync({
                                  ...settings,
                                  accountCardDisplay: { ...currentDisplay, normal: mode }
                                });
                                toast.success(`Regular account display updated to ${mode}`);
                              } catch (err) {
                                console.error('Failed to update account display:', err);
                                toast.error('Failed to update account display');
                              }
                            }}
                            disabled={updateSettingsMutation.isPending}
                            className="w-4 h-4 text-blue-600 dark:text-blue-400"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{mode}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">
                              {mode === 'compact' ? 'Simple list view' : 'Rich visual cards'}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Investment Accounts */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Investment Accounts</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {(['compact', 'detailed'] as const).map((mode) => (
                        <label
                          key={`investment-${mode}`}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${(settings.accountCardDisplay?.investment || 'detailed') === mode
                            ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                          <input
                            type="radio"
                            name="investmentAccountDisplay"
                            value={mode}
                            checked={(settings.accountCardDisplay?.investment || 'detailed') === mode}
                            onChange={async () => {
                              try {
                                const currentDisplay = settings.accountCardDisplay || { normal: 'detailed', investment: 'detailed', cd: 'detailed' };
                                await updateSettingsMutation.mutateAsync({
                                  ...settings,
                                  accountCardDisplay: { ...currentDisplay, investment: mode }
                                });
                                toast.success(`Investment account display updated to ${mode}`);
                              } catch (err) {
                                console.error('Failed to update account display:', err);
                                toast.error('Failed to update account display');
                              }
                            }}
                            disabled={updateSettingsMutation.isPending}
                            className="w-4 h-4 text-blue-600 dark:text-blue-400"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{mode}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">
                              {mode === 'compact' ? 'Simple list view' : 'Rich visual cards'}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* CD Accounts */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Certificate of Deposit (CD)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {(['compact', 'detailed'] as const).map((mode) => (
                        <label
                          key={`cd-${mode}`}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${(settings.accountCardDisplay?.cd || 'detailed') === mode
                            ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                          <input
                            type="radio"
                            name="cdAccountDisplay"
                            value={mode}
                            checked={(settings.accountCardDisplay?.cd || 'detailed') === mode}
                            onChange={async () => {
                              try {
                                const currentDisplay = settings.accountCardDisplay || { normal: 'detailed', investment: 'detailed', cd: 'detailed' };
                                await updateSettingsMutation.mutateAsync({
                                  ...settings,
                                  accountCardDisplay: { ...currentDisplay, cd: mode }
                                });
                                toast.success(`CD account display updated to ${mode}`);
                              } catch (err) {
                                console.error('Failed to update account display:', err);
                                toast.error('Failed to update account display');
                              }
                            }}
                            disabled={updateSettingsMutation.isPending}
                            className="w-4 h-4 text-blue-600 dark:text-blue-400"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{mode}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">
                              {mode === 'compact' ? 'Simple list view' : 'Rich visual cards'}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Net Worth Snapshots</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Automated tracking of your financial progress.
                </p>
                <div className="space-y-3">
                  {(['daily', 'weekly', 'monthly', 'manual'] as const).map((frequency) => (
                    <label
                      key={frequency}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${(settings.snapshotFrequency || 'weekly') === frequency
                        ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <input
                        type="radio"
                        name="snapshotFrequency"
                        value={frequency}
                        checked={(settings.snapshotFrequency || 'weekly') === frequency}
                        onChange={async () => {
                          try {
                            await updateSettingsMutation.mutateAsync({ ...settings, snapshotFrequency: frequency });
                            toast.success(`Snapshot frequency updated to ${frequency}`);
                          } catch (err) {
                            console.error('Failed to update snapshot frequency:', err);
                            toast.error('Failed to update snapshot frequency');
                          }
                        }}
                        disabled={updateSettingsMutation.isPending}
                        className="w-4 h-4 text-blue-600 dark:text-blue-400"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 capitalize block">{frequency}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {frequency === 'daily' && 'Track every day'}
                          {frequency === 'weekly' && 'Track weekly (Recommended)'}
                          {frequency === 'monthly' && 'Track monthly'}
                          {frequency === 'manual' && 'No automation'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </Card>
          </section>
        </div>

        {/* Right Column: Data & Debug */}
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <Download className="w-5 h-5" />
              </span>
              Data Management
            </h2>
            <Card>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Export Backup</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Download all your data as JSON</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleExportData}
                    loading={isExporting}
                    disabled={isExporting}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recalculate Balances</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fix synchronization issues</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleRecalculateBalances}
                    loading={isRecalculating}
                    disabled={isRecalculating}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sync Investments</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Update investment values</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      try {
                        const { syncAllInvestmentAccounts } = await import('../utils/syncInvestmentAccounts');
                        await syncAllInvestmentAccounts();
                        queryClient.invalidateQueries({ queryKey: ['accounts'] });
                        toast.success('Investment accounts synced successfully!');
                      } catch (err) {
                        console.error('Sync failed:', err);
                        toast.error('Failed to sync investment accounts');
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Migrate Orphans</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Restore missing movements</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleMigrateOrphans}
                    loading={isMigrating}
                    disabled={isMigrating}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Migrate
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                <RefreshCw className="w-5 h-5" />
              </span>
              Debug Tools
            </h2>
            <Card>
              <div className="grid grid-cols-1 gap-4">
                <DebugStockPrice />
                <DebugExchangeRate />
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
