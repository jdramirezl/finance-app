import { Target } from 'lucide-react';
import type { Settings } from '../../types';
import AccountPocketSelector from '../movements/AccountPocketSelector';
import Card from '../ui/Card';

export interface DefaultAccountsSectionProps {
  settings: Settings;
  isUpdating: boolean;
  onDefaultExpenseChange: (accountId: string, pocketId: string) => void | Promise<void>;
  onDefaultIncomeChange: (accountId: string, pocketId: string) => void | Promise<void>;
}

const DefaultAccountsSection = ({
  settings,
  isUpdating,
  onDefaultExpenseChange,
  onDefaultIncomeChange,
}: DefaultAccountsSectionProps) => {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-6 text-gray-100 flex items-center gap-3">
        <span className="p-2 bg-[#adc6ff]/10 rounded-lg text-[#adc6ff]">
          <Target className="w-5 h-5" />
        </span>
        Default Accounts
      </h2>

      <Card className="space-y-6">
        <p className="text-sm text-gray-400">
          Set default accounts for quick-add. Used when no recent selection exists.
        </p>

        <div>
          <h3 className="text-lg font-medium text-gray-100 mb-3">
            Default for Expenses
          </h3>
          <AccountPocketSelector
            accountId={settings.defaultExpenseAccountId || ''}
            pocketId={settings.defaultExpensePocketId || ''}
            onAccountChange={(accountId) => onDefaultExpenseChange(accountId, '')}
            onPocketChange={(pocketId) =>
              onDefaultExpenseChange(settings.defaultExpenseAccountId || '', pocketId)
            }
            showAccountCurrency
            disabled={isUpdating}
          />
        </div>

        <hr className="border-gray-700" />

        <div>
          <h3 className="text-lg font-medium text-gray-100 mb-3">
            Default for Income
          </h3>
          <AccountPocketSelector
            accountId={settings.defaultIncomeAccountId || ''}
            pocketId={settings.defaultIncomePocketId || ''}
            onAccountChange={(accountId) => onDefaultIncomeChange(accountId, '')}
            onPocketChange={(pocketId) =>
              onDefaultIncomeChange(settings.defaultIncomeAccountId || '', pocketId)
            }
            showAccountCurrency
            disabled={isUpdating}
          />
        </div>
      </Card>
    </section>
  );
};

export default DefaultAccountsSection;
