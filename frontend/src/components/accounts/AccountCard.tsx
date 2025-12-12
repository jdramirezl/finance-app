import type { Account } from '../../types';
import { EditDeleteActions } from '../ActionButtons';
import { TrendingUp, Wallet } from 'lucide-react';
import SelectableValue from '../SelectableValue';

interface AccountCardProps {
    account: Account;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
    isFixedExpensesAccount?: boolean;
}

const AccountCard = ({
    account,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    isDeleting = false,
    isFixedExpensesAccount = false,
}: AccountCardProps) => {
    const isInvestment = account.type === 'investment';

    return (
        <div
            onClick={onSelect}
            className={`p-4 bg-white dark:bg-gray-800 rounded-lg border-2 cursor-pointer transition-all group relative overflow-hidden ${isSelected
                ? 'border-blue-500 dark:border-blue-400 shadow-md'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${isInvestment ? 'bg-gradient-to-r from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/10' : ''} ${isFixedExpensesAccount ? 'bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/10' : ''}`}
        >
            {isInvestment && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-bl-full -mr-8 -mt-8 z-0" />
            )}
            {isFixedExpensesAccount && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-bl-full -mr-8 -mt-8 z-0" />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-4 sm:gap-0">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div
                        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isInvestment
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                            : isFixedExpensesAccount
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        {isInvestment ? <TrendingUp className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">{account.name}</h3>
                            {isInvestment && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800 whitespace-nowrap">
                                    Investments
                                </span>
                            )}
                            {isFixedExpensesAccount && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                                    Fixed Expenses
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }} />
                            <span>{account.currency}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
                    <span className={`font-mono text-sm sm:text-lg truncate min-w-0 flex-1 sm:flex-none ${isInvestment ? 'text-purple-700 dark:text-purple-300 font-bold' : isFixedExpensesAccount ? 'text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-900 dark:text-gray-100'}`}>
                        <SelectableValue id={`acc-bal-${account.id}`} value={account.balance} currency={account.currency}>
                            {account.balance.toLocaleString(undefined, {
                                style: 'currency',
                                currency: account.currency,
                            })}
                        </SelectableValue>
                    </span>
                    <div onClick={(e) => e.stopPropagation()}>
                        <EditDeleteActions
                            onEdit={onEdit}
                            onDelete={onDelete}
                            isDeleting={isDeleting}
                            showOnHover={false} // Always show on mobile? Or just depend on click.
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountCard;
