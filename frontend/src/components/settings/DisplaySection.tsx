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
        <h3 className="text-2xl font-semibold text-gray-100 mb-1">Display</h3>
        <p className="text-gray-400 text-sm">
          Choose how account cards appear on the summary page.
        </p>
      </div>

      <Card>
        <div className="space-y-6">
          {(Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map((kind) => (
            <div key={kind}>
              <h4 className="font-medium text-gray-100 mb-3">{ACCOUNT_KIND_LABELS[kind]}</h4>
              <div className="grid grid-cols-2 gap-3">
                {DISPLAY_MODES.map((mode) => {
                  const active = (display[kind] || 'detailed') === mode;
                  return (
                    <label
                      key={`${kind}-${mode}`}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        active
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${kind}AccountDisplay`}
                        value={mode}
                        checked={active}
                        onChange={() => onDisplayChange(kind, mode)}
                        disabled={isUpdating}
                        className="w-4 h-4 text-blue-400"
                      />
                      <div>
                        <span className="font-medium text-gray-100 capitalize">{mode}</span>
                        <span className="text-xs text-gray-400 block">
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
