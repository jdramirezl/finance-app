import type { Account, Pocket } from '../../types';
import { currencyService } from '../../services/currencyService';

interface AccountSummaryCardProps {
    account: Account;
    pockets: Pocket[];
}

const AccountSummaryCard = ({ account, pockets }: AccountSummaryCardProps) => {
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
                    {currencyService.formatCurrency(account.balance, account.currency)}
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
                            {currencyService.formatCurrency(pocket.balance, pocket.currency)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AccountSummaryCard;
