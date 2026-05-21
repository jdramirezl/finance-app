import { RefreshCw, Sliders } from 'lucide-react';
import type {
  AccountCardDisplayMode,
  AccountCardDisplaySettings,
  Currency,
  DateFormatPreference,
  Settings,
  SnapshotFrequency,
} from '../../types';
import { DATE_FORMAT_OPTIONS } from '../../types';
import { SUPPORTED_CURRENCIES } from '../../constants';
import Card from '../ui/Card';

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
  onDateFormatChange: (format: DateFormatPreference) => void | Promise<void>;
  onMovementsPerPageChange: (count: number) => void | Promise<void>;
  onReminderAdvanceDaysChange: (days: number) => void | Promise<void>;
  onDefaultCurrencyChange: (currency: Currency) => void | Promise<void>;
}

/**
 * General preferences card: primary currency, per-account-kind card display
 * mode, net-worth snapshot frequency, and user preferences.
 */
const PreferencesSection = ({
  settings,
  isUpdating,
  onCurrencyChange,
  onDisplayChange,
  onSnapshotFrequencyChange,
  onDateFormatChange,
  onMovementsPerPageChange,
  onReminderAdvanceDaysChange,
  onDefaultCurrencyChange,
}: PreferencesSectionProps) => {
  const display = settings.accountCardDisplay || DEFAULT_DISPLAY;
  const snapshotFrequency = settings.snapshotFrequency || 'weekly';

  return (
    <section className="space-y-12">
      {/* General Preferences */}
      <div>
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
              {SUPPORTED_CURRENCIES.map((currency) => {
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
              Choose how account cards appear on the summary page for each account type.
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
                              {mode === 'compact' ? 'Simple list view' : 'Rich visual cards'}
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
      </div>

      {/* User Preferences */}
      <div>
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Sliders className="w-5 h-5" />
          </span>
          Preferences
        </h2>

        <Card className="space-y-6">
          {/* Date Format */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Date Format
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              How dates are displayed throughout the app.
            </p>
            <select
              value={settings.dateFormat}
              onChange={(e) => onDateFormatChange(e.target.value as DateFormatPreference)}
              disabled={isUpdating}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Movements Per Page */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Movements Per Page
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Number of transactions loaded at a time (10–200).
            </p>
            <input
              type="number"
              min={10}
              max={200}
              value={settings.movementsPerPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 10 && val <= 200) onMovementsPerPageChange(val);
              }}
              disabled={isUpdating}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Reminder Advance Days */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Reminder Advance Days
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Days before due date to mark reminders as "this week" (1–30).
            </p>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.reminderAdvanceDays}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= 30) onReminderAdvanceDaysChange(val);
              }}
              disabled={isUpdating}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Default Currency for New Accounts */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Default Currency for New Accounts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Pre-selected currency when creating a new account.
            </p>
            <select
              value={settings.defaultCurrencyForNewAccounts}
              onChange={(e) => onDefaultCurrencyChange(e.target.value as Currency)}
              disabled={isUpdating}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default PreferencesSection;
