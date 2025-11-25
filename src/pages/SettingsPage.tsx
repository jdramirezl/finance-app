import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { currencyService } from '../services/currencyService';
import type { Currency } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { RefreshCw } from 'lucide-react';
import { migrateOrphanedMovements } from '../utils/migrateOrphanedMovements';
import { useToast } from '../hooks/useToast';

const SettingsPage = () => {
  const { settings, loadSettings, updateSettings, loadMovements } = useFinanceStore();
  const toast = useToast();
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadSettings();
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadData();
  }, [loadSettings]);

  const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  const handleCurrencyChange = async (currency: Currency) => {
    try {
      currencyService.setPrimaryCurrency(currency);
      await updateSettings({ primaryCurrency: currency });
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const handleMigrateOrphans = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateOrphanedMovements();
      await loadMovements(); // Reload to reflect changes
      toast.success(`Migration complete: ${result.marked} movements updated out of ${result.total} total`);
    } catch (err) {
      console.error('Migration failed:', err);
      toast.error('Failed to migrate orphaned movements');
    } finally {
      setIsMigrating(false);
    }
  };

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
              className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                settings.primaryCurrency === currency
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
