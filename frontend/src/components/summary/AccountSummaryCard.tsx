import type { Account, Pocket } from '../../types';
import { currencyService } from '../../services/currencyService';
import { Wallet, CreditCard, Banknote, PiggyBank, Lock } from 'lucide-react';
import SelectableValue from '../SelectableValue';

interface AccountSummaryCardProps {
    account: Account;
    pockets: Pocket[];
}

const AccountSummaryCard = ({ account, pockets }: AccountSummaryCardProps) => {
    // Get account type icon
    const getAccountIcon = () => {
        switch (account.type) {
            case 'checking':
                return <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
            case 'savings':
                return <PiggyBank className="w-4 h-4 text-green-600 dark:text-green-400" />;
            case 'cash':
                return <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
            default:
                return <Wallet className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
        }
    };

    // Get account type label
    const getAccountTypeLabel = () => {
        switch (account.type) {
            case 'checking':
                return 'Checking Account';
            case 'savings':
                return 'Savings Account';
            case 'cash':
                return 'Cash';
            default:
                return 'Account';
        }
    };

    // Calculate pocket distribution for visual representation
    const totalBalance = account.balance;
    const pocketPercentages = pockets.map(pocket => ({
        ...pocket,
        percentage: totalBalance > 0 ? (pocket.balance / totalBalance) * 100 : 0
    }));

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border-l-4" style={{ borderColor: account.color }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${account.color}20`, border: `2px solid ${account.color}` }}
                    >
                        {getAccountIcon()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                {account.name}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {getAccountTypeLabel()}
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {pockets.length} pocket{pockets.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                        <SelectableValue id={`acc-sum-bal-${account.id}`} value={account.balance} currency={account.currency}>
                            {currencyService.formatCurrency(account.balance, account.currency)}
                        </SelectableValue>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total Balance
                    </div>
                </div>
            </div>

            {/* Balance Distribution Bar */}
            {pockets.length > 1 && totalBalance > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Balance Distribution</span>
                        <span>{pockets.length} pockets</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div className="flex h-full">
                            {pocketPercentages.map((pocket, index) => (
                                <div
                                    key={pocket.id}
                                    className="h-full transition-all duration-300"
                                    style={{
                                        width: `${pocket.percentage}%`,
                                        backgroundColor: index === 0 ? account.color : 
                                                       index === 1 ? `${account.color}80` :
                                                       index === 2 ? `${account.color}60` :
                                                       `${account.color}40`
                                    }}
                                    title={`${pocket.name}: ${pocket.percentage.toFixed(1)}%`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pockets List */}
            <div className="space-y-2">
                {pockets.map((pocket, index) => (
                    <div key={pocket.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                    backgroundColor: index === 0 ? account.color : 
                                                   index === 1 ? `${account.color}80` :
                                                   index === 2 ? `${account.color}60` :
                                                   `${account.color}40`
                                }}
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {pocket.name}
                                    </span>
                                    {pocket.type === 'fixed' && (
                                        <div className="flex items-center gap-1">
                                            <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                            <span className="text-xs font-medium px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                                Fixed
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {totalBalance > 0 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {((pocket.balance / totalBalance) * 100).toFixed(1)}% of total
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                <SelectableValue id={`pocket-sum-bal-${pocket.id}`} value={pocket.balance} currency={pocket.currency}>
                                    {currencyService.formatCurrency(pocket.balance, pocket.currency)}
                                </SelectableValue>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AccountSummaryCard;
