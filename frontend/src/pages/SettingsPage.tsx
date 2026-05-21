import { useState } from 'react';
import { Settings as SettingsIcon, Wallet, Palette, Database, Info } from 'lucide-react';
import { useSettingsQuery, useUpdateSettings } from '../hooks/queries';
import { useSettingsActions } from '../hooks/actions/useSettingsActions';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import {
  DefaultAccountsSection,
  PreferencesSection,
  DisplaySection,
  DataPrivacySection,
  AboutSection,
} from '../components/settings';

type SettingsSection = 'preferences' | 'default-accounts' | 'display' | 'data-privacy' | 'about';

const NAV_ITEMS: { id: SettingsSection; label: string; icon: typeof SettingsIcon }[] = [
  { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  { id: 'default-accounts', label: 'Default Accounts', icon: Wallet },
  { id: 'display', label: 'Display', icon: Palette },
  { id: 'data-privacy', label: 'Data & Privacy', icon: Database },
  { id: 'about', label: 'About', icon: Info },
];

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('preferences');
  const { data: settings, isLoading } = useSettingsQuery();
  const updateMutation = useUpdateSettings();
  const toast = useToast();
  const actions = useSettingsActions({ settings, updateMutation, toast });

  if (isLoading || !settings) {
    return (
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <nav className="w-full lg:w-72 bg-surface-container-low/30 border-r border-white/5 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-7 bg-surface-container-high rounded w-1/2" />
            <div className="h-10 bg-surface-container-high rounded" />
            <div className="h-10 bg-surface-container-high rounded" />
            <div className="h-10 bg-surface-container-high rounded" />
          </div>
        </nav>
        <section className="flex-1 p-8">
          <Card>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-surface-container-high rounded w-1/4" />
              <div className="h-10 bg-surface-container-high rounded" />
              <div className="h-10 bg-surface-container-high rounded" />
            </div>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Navigation */}
      <nav className="w-full lg:w-72 bg-surface-container-low/30 border-b lg:border-b-0 lg:border-r border-white/5 p-4 lg:p-8 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
        <h2 className="hidden lg:block text-xl font-semibold text-on-surface mb-6 px-2">
          Settings
        </h2>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left whitespace-nowrap ${
              activeSection === id
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-bright/30'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </nav>

      {/* Right Content Area */}
      <section className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {activeSection === 'preferences' && (
            <PreferencesSection
              settings={settings}
              isUpdating={updateMutation.isPending}
              onCurrencyChange={actions.handleCurrencyChange}
              onSnapshotFrequencyChange={actions.handleSnapshotFrequencyChange}
              onDateFormatChange={actions.handleDateFormatChange}
              onMovementsPerPageChange={actions.handleMovementsPerPageChange}
              onReminderAdvanceDaysChange={actions.handleReminderAdvanceDaysChange}
              onDefaultCurrencyChange={actions.handleDefaultCurrencyChange}
            />
          )}
          {activeSection === 'default-accounts' && (
            <DefaultAccountsSection
              settings={settings}
              isUpdating={updateMutation.isPending}
              onDefaultExpenseChange={actions.handleDefaultExpenseChange}
              onDefaultIncomeChange={actions.handleDefaultIncomeChange}
            />
          )}
          {activeSection === 'display' && (
            <DisplaySection
              settings={settings}
              isUpdating={updateMutation.isPending}
              onDisplayChange={actions.handleDisplayChange}
            />
          )}
          {activeSection === 'data-privacy' && (
            <DataPrivacySection
              isExporting={actions.isExporting}
              onExport={actions.handleExport}
            />
          )}
          {activeSection === 'about' && <AboutSection />}
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
