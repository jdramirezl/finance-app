import { RefreshCw } from 'lucide-react';
import type {
  AccountCardDisplayMode,
  AccountCardDisplaySettings,
  Currency,
  Settings,
  SnapshotFrequency,
} from '../../types';
import Card from '../Card';

const CURRENCIES: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
const DISPLAY_MODES: AccountCardDisplayMode[] = ['compact', 'detailed'];
const SNAPSHOT_FREQUENCIES: SnapshotFrequency[] = ['daily', 'weekly', 'monthly', 'manual'];

const DEFAULT_DISPLAY: AccountCardDisplaySettings = {
  normal: 'detailed',
  investment: 'detailed',
  cd: 'detailed',
};

type AccountKind = keyof AccountCardDisplaySettings;

const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  normal: 'Regular Accounts',
  investment: 'Investment Accounts',
  cd: 'Certificate of Deposit (CD)',
};

const SNAPSHOT_DESCRIPTIONS: Record<SnapshotFrequency, string> = {
  daily: 'Track every day',
  weekly: 'Track weekly (Recommended)',
  monthly: 'Track monthly',
  manual: 'No automation',
};

export interface PreferencesSectionProps {
  settings: Settings;
  isUpdating: boolean;
  onCurrencyChange: (currency: Currency) => void | Promise<void>;
  onDisplayChange: (
    kind: AccountKind,
    mode: AccountCardDisplayMode
  ) => void | Promise<void>;
  onSnapshotFrequencyChange: (frequency: SnapshotFrequency) => void | Promise<void>;
}

/**
 * General preferences card: primary currency, per-account-kind card display
 * mode, and net-worth snapshot frequency. The page owns the mutation and
 * passes the change handlers in.
 */
const PreferencesSection = ({
  settings,
  isUpdating,
  onCurrencyChange,
  onDisplayChange,
  onSnapshotFrequencyChange,
}: PreferencesSectionProps) => {
  const display = settings.accountCardDisplay || DEFAULT_DISPLAY;
  const snapshotFrequency = settings.snapshotFrequency || 'weekly';

  return (
    <section>
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-3">
        <span className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          <RefreshCw className="w-5 h-5" />
        </span>
        General Preferences
      </h2>

      <Card className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Primary Currency
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select your primary currency for all total calculations.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CURRENCIES.map((currency) => {
              const active = settings.primaryCurrency === currency;
              return (
                <label
                  key={currency}
                  className={`relative flex flex-col p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                    active
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="primaryCurrency"
                    value={currency}
                    checked={active}
                    onChange={() => onCurrencyChange(currency)}
                    className="sr-only"
                  />
                  <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                    {currency}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {active ? 'Active' : 'Select'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Account Card Display
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose how account cards appear on the summary page for each account
            type.
          </p>
          <div className="space-y-4">
            {(Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map((kind) => (
              <div key={kind}>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {ACCOUNT_KIND_LABELS[kind]}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {DISPLAY_MODES.map((mode) => {
                    const current = display[kind] || 'detailed';
                    const active = current === mode;
                    return (
                      <label
                        key={`${kind}-${mode}`}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          active
                            ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${kind}AccountDisplay`}
                          value={mode}
                          checked={active}
                          onChange={() => onDisplayChange(kind, mode)}
                          disabled={isUpdating}
                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {mode}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            {mode === 'compact'
                              ? 'Simple list view'
                              : 'Rich visual cards'}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Net Worth Snapshots
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Automated tracking of your financial progress.
          </p>
          <div className="space-y-3">
            {SNAPSHOT_FREQUENCIES.map((frequency) => {
              const active = snapshotFrequency === frequency;
              return (
                <label
                  key={frequency}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    active
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="snapshotFrequency"
                    value={frequency}
                    checked={active}
                    onChange={() => onSnapshotFrequencyChange(frequency)}
                    disabled={isUpdating}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize block">
                      {frequency}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {SNAPSHOT_DESCRIPTIONS[frequency]}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
};

export default PreferencesSection;
