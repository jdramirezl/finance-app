import type {
  Currency,
  DateFormatPreference,
  Settings,
  SnapshotFrequency,
} from '../../types';
import { DATE_FORMAT_OPTIONS } from '../../types';
import { SUPPORTED_CURRENCIES } from '../../constants';
import Card from '../ui/Card';

const SNAPSHOT_FREQUENCIES: SnapshotFrequency[] = ['daily', 'weekly', 'monthly', 'manual'];

export interface PreferencesSectionProps {
  settings: Settings;
  isUpdating: boolean;
  onCurrencyChange: (currency: Currency) => void | Promise<void>;
  onSnapshotFrequencyChange: (frequency: SnapshotFrequency) => void | Promise<void>;
  onDateFormatChange: (format: DateFormatPreference) => void | Promise<void>;
  onMovementsPerPageChange: (count: number) => void | Promise<void>;
  onReminderAdvanceDaysChange: (days: number) => void | Promise<void>;
  onDefaultCurrencyChange: (currency: Currency) => void | Promise<void>;
}

const PreferencesSection = ({
  settings,
  isUpdating,
  onCurrencyChange,
  onSnapshotFrequencyChange,
  onDateFormatChange,
  onMovementsPerPageChange,
  onReminderAdvanceDaysChange,
  onDefaultCurrencyChange,
}: PreferencesSectionProps) => {
  const snapshotFrequency = settings.snapshotFrequency || 'weekly';

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-gray-100 mb-1">Preferences</h3>
        <p className="text-gray-400 text-sm">
          Manage your global application behavior and notification settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Interface Appearance Card */}
        <Card className="md:col-span-2">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-700">
            <span className="text-blue-400 text-lg">&#9881;</span>
            <h4 className="text-lg font-semibold text-gray-100">Interface Appearance</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Snapshot Frequency
              </label>
              <select
                value={snapshotFrequency}
                onChange={(e) => onSnapshotFrequencyChange(e.target.value as SnapshotFrequency)}
                disabled={isUpdating}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:border-blue-500 outline-none appearance-none"
              >
                {SNAPSHOT_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Movements Per Page
              </label>
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
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Reminder Advance Days
              </label>
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
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Date Format Card */}
        <Card>
          <h4 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-blue-300">&#128197;</span>
            Date Format
          </h4>
          <select
            value={settings.dateFormat}
            onChange={(e) => onDateFormatChange(e.target.value as DateFormatPreference)}
            disabled={isUpdating}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:border-blue-500 outline-none appearance-none"
          >
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </Card>

        {/* Currency & Locality Card */}
        <Card>
          <h4 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-amber-400">&#128176;</span>
            Currency &amp; Locality
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Base Currency
              </label>
              <select
                value={settings.primaryCurrency}
                onChange={(e) => onCurrencyChange(e.target.value as Currency)}
                disabled={isUpdating}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:border-blue-500 outline-none appearance-none"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Default for New Accounts
              </label>
              <select
                value={settings.defaultCurrencyForNewAccounts}
                onChange={(e) => onDefaultCurrencyChange(e.target.value as Currency)}
                disabled={isUpdating}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:border-blue-500 outline-none appearance-none"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PreferencesSection;
