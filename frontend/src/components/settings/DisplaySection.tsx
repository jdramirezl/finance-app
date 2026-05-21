import type {
  AccountCardDisplayMode,
  AccountCardDisplaySettings,
  Settings,
} from '../../types';
import Card from '../ui/Card';

const DISPLAY_MODES: AccountCardDisplayMode[] = ['compact', 'detailed'];

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

export interface DisplaySectionProps {
  settings: Settings;
  isUpdating: boolean;
  onDisplayChange: (kind: AccountKind, mode: AccountCardDisplayMode) => void | Promise<void>;
}

const DisplaySection = ({ settings, isUpdating, onDisplayChange }: DisplaySectionProps) => {
  const display = settings.accountCardDisplay || DEFAULT_DISPLAY;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-on-surface mb-1">Display</h3>
        <p className="text-on-surface-variant text-sm">
          Choose how account cards appear on the summary page.
        </p>
      </div>

      <Card>
        <div className="space-y-6">
          {(Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map((kind) => (
            <div key={kind}>
              <h4 className="font-medium text-on-surface mb-3">{ACCOUNT_KIND_LABELS[kind]}</h4>
              <div className="grid grid-cols-2 gap-3">
                {DISPLAY_MODES.map((mode) => {
                  const active = (display[kind] || 'detailed') === mode;
                  return (
                    <label
                      key={`${kind}-${mode}`}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        active
                          ? 'border-primary bg-primary/10'
                          : 'border-outline-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${kind}AccountDisplay`}
                        value={mode}
                        checked={active}
                        onChange={() => onDisplayChange(kind, mode)}
                        disabled={isUpdating}
                        className="w-4 h-4 text-primary"
                      />
                      <div>
                        <span className="font-medium text-on-surface capitalize">{mode}</span>
                        <span className="text-xs text-on-surface-variant block">
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
      </Card>
    </div>
  );
};

export default DisplaySection;
