import type { Account, Pocket } from '../../types';
import { currencyService } from '../../services/currencyService';
import SelectableValue from '../SelectableValue';

interface AccountSummaryCardCompactProps {
    account: Account;
    pockets: Pocket[];
}

const AccountSummaryCardCompact = ({ account, pockets }: AccountSummaryCardCompactProps) => {
    return (
        <div className="border-l-4 pl-4" style={{ borderColor: account.color }}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                    />
                    <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {account.name}
                    </span>
                </div>
                <span className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <SelectableValue id={`acc-sum-bal-${account.id}`} value={account.balance} currency={account.currency}>
                        {currencyService.formatCurrency(account.balance, account.currency)}
                    </SelectableValue>
                </span>
            </div>

            <div className="ml-5 space-y-1">
                {pockets.map((pocket) => (
                    <div key={pocket.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                            {pocket.name}
                            {pocket.type === 'fixed' && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                    (fixed)
                                </span>
                            )}
                        </span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                            <SelectableValue id={`pocket-sum-bal-${pocket.id}`} value={pocket.balance} currency={pocket.currency}>
                                {currencyService.formatCurrency(pocket.balance, pocket.currency)}
                            </SelectableValue>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AccountSummaryCardCompact;