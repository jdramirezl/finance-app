import { ArrowLeft } from 'lucide-react';
import type { Account, CDInvestmentAccount, Pocket } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import CDDetailsPanel from './CDDetailsPanel';
import PocketManagementSection from './PocketManagementSection';
import type { useToast } from '../../hooks/useToast';
import type { useConfirm } from '../../hooks/useConfirm';
import type { usePocketMutations } from '../../hooks/queries/usePocketMutations';

type PocketMutations = ReturnType<typeof usePocketMutations>;

interface AccountDetailPanelProps {
  account: Account;
  pockets: Pocket[];
  accounts: Account[];
  pocketMutations: PocketMutations;
  toast: ReturnType<typeof useToast.getState>;
  confirm: ReturnType<typeof useConfirm>['confirm'];
  setError: (value: string | null) => void;
  onEditAccount: (account: Account) => void;
  onEditCD: (account: CDInvestmentAccount) => void;
  onCascadeDelete: (id: string) => void;
  onClose: () => void;
  onMobileBack: () => void;
}

/**
 * Right-hand panel showing the selected account's header (name, balance,
 * edit / delete-all actions) and either the CD details panel or the pocket
 * management section depending on account type.
 */
const AccountDetailPanel = ({
  account,
  pockets,
  accounts,
  pocketMutations,
  toast,
  confirm,
  setError,
  onEditAccount,
  onEditCD,
  onCascadeDelete,
  onClose,
  onMobileBack,
}: AccountDetailPanelProps) => {
  // Mirror the original page's permissive type check (only inspects `type`).
  const isCD = account.type === 'cd';

  return (
    <>
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-1"
              onClick={onMobileBack}
              aria-label="Back to accounts list"
              title="Back to accounts"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Account Details
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hidden md:flex"
          >
            Close
          </Button>
        </div>

        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: account.color }}
          >
            {account.currency}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {account.name}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Balance:{' '}
              <span className={`font-medium ${account.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                ${account.balance.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => onEditAccount(account)}
          >
            Edit Account
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => onCascadeDelete(account.id)}
          >
            Delete All
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        {isCD ? (
          <CDDetailsPanel
            account={account as CDInvestmentAccount}
            onEdit={() => onEditCD(account as CDInvestmentAccount)}
          />
        ) : (
          <PocketManagementSection
            accountId={account.id}
            accounts={accounts}
            pockets={pockets}
            pocketMutations={pocketMutations}
            toast={toast}
            confirm={confirm}
            setError={setError}
          />
        )}
      </Card>
    </>
  );
};

export default AccountDetailPanel;
