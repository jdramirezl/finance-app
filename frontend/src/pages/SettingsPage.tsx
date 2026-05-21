import { useSettingsQuery, useUpdateSettings } from '../hooks/queries';
import { useSettingsActions } from '../hooks/actions/useSettingsActions';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import {
  DangerZoneSection,
  DefaultAccountsSection,
  ExportImportSection,
  PreferencesSection,
} from '../components/settings';

const SettingsPage = () => {
  const { data: settings, isLoading } = useSettingsQuery();
  const updateMutation = useUpdateSettings();
  const toast = useToast();
  const actions = useSettingsActions({ settings, updateMutation, toast });

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-on-surface">Settings</h1>
        <Card className="max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-surface-container-high rounded w-1/4" />
            <div className="h-10 bg-surface-container-high rounded" />
            <div className="h-10 bg-surface-container-high rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-4xl font-bold text-on-surface tracking-tight">
            Settings
          </h1>
          <p className="text-lg text-on-surface-variant mt-2">
            Manage your application preferences and data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <div className="space-y-12">
          <PreferencesSection
            settings={settings}
            isUpdating={updateMutation.isPending}
            onCurrencyChange={actions.handleCurrencyChange}
            onDisplayChange={actions.handleDisplayChange}
            onSnapshotFrequencyChange={actions.handleSnapshotFrequencyChange}
            onDateFormatChange={actions.handleDateFormatChange}
            onMovementsPerPageChange={actions.handleMovementsPerPageChange}
            onReminderAdvanceDaysChange={actions.handleReminderAdvanceDaysChange}
            onDefaultCurrencyChange={actions.handleDefaultCurrencyChange}
          />
          <DefaultAccountsSection
            settings={settings}
            isUpdating={updateMutation.isPending}
            onDefaultExpenseChange={actions.handleDefaultExpenseChange}
            onDefaultIncomeChange={actions.handleDefaultIncomeChange}
          />
        </div>

        <div className="space-y-12">
          <ExportImportSection
            isExporting={actions.isExporting}
            onExport={actions.handleExport}
          />
          <DangerZoneSection />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
