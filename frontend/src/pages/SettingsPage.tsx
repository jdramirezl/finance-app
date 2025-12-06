import { useState } from 'react';
import { useSettingsQuery } from '../hooks/queries';
import { useUpdateSettings } from '../hooks/mutations';
import { currencyService } from '../services/currencyService';
import { movementService } from '../services/movementService';
import { accountService } from '../services/accountService';
import type { Currency } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { RefreshCw } from 'lucide-react';
import { migrateOrphanedMovements } from '../utils/migrateOrphanedMovements';
import { useToast } from '../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

const SettingsPage = () => {
  // TanStack Query hooks
  const { data: settings, isLoading } = useSettingsQuery();
  const updateSettingsMutation = useUpdateSettings();
  const queryClient = useQueryClient();

  const toast = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      <Card className="max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Primary Currency</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select your primary currency. All totals will be converted and displayed in this currency
          on the Summary page.
        </p>

        <div className="space-y-2">
          {currencies.map((currency) => (
            <label
              key={currency}
              className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${settings.primaryCurrency === currency
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <input
                type="radio"
                name="primaryCurrency"
                value={currency}
                checked={settings.primaryCurrency === currency}
                onChange={() => handleCurrencyChange(currency)}
                className="w-4 h-4 text-blue-600 dark:text-blue-400"
              />
              <span className="font-medium text-lg text-gray-900 dark:text-gray-100">{currency}</span>
              {settings.primaryCurrency === currency && (
                <span className="ml-auto text-sm text-blue-600 dark:text-blue-400 font-medium">Primary</span>
              )}
            </label>
          ))}
        </div>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Balance Recalculation</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Recalculate all account and pocket balances from movements. This will fix any incorrect balances caused by pending movements being included.
        </p>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>When to run:</strong> If you see incorrect balances in your accounts or pockets, especially negative balances where they shouldn't be. This will exclude pending movements from calculations.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleRecalculateBalances}
          loading={isRecalculating}
          disabled={isRecalculating}
        >
          <RefreshCw className="w-5 h-5" />
          Recalculate All Balances
        </Button>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Net Worth Snapshots</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Take periodic snapshots of your net worth to visualize your financial progress over time.
        </p>

        <div className="space-y-2">
          {(['daily', 'weekly', 'monthly', 'manual'] as const).map((frequency) => (
            <label
              key={frequency}
              className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${(settings.snapshotFrequency || 'weekly') === frequency
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <input
                type="radio"
                name="snapshotFrequency"
                value={frequency}
                checked={(settings.snapshotFrequency || 'weekly') === frequency}
                onChange={() => updateSettingsMutation.mutate({ ...settings, snapshotFrequency: frequency })}
                className="w-4 h-4 text-blue-600 dark:text-blue-400"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{frequency}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {frequency === 'daily' && 'Snapshot every day'}
                  {frequency === 'weekly' && 'Snapshot once a week'}
                  {frequency === 'monthly' && 'Snapshot once a month'}
                  {frequency === 'manual' && 'Only when you manually trigger'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Data Migration</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Run this migration once to mark existing orphaned movements. This will scan all movements and flag any that belong to deleted accounts or pockets.
        </p>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>When to run:</strong> After upgrading to the new orphaned movements system, or if you notice movements that should be hidden but aren't.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleMigrateOrphans}
          loading={isMigrating}
          disabled={isMigrating}
        >
          <RefreshCw className="w-5 h-5" />
          Migrate Orphaned Movements
        </Button>
      </Card>
    </div>
  );
};

export default SettingsPage;
