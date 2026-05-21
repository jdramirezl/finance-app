import { memo } from 'react';
import type { Account } from '../../types';
import { EditDeleteActions } from '../ui/ActionButtons';
import { TrendingUp, Wallet } from 'lucide-react';
import SelectableValue from '../ui/SelectableValue';

interface AccountCardProps {
    account: Account;
    isSelected: boolean;
    /**
     * Receives the account so the parent can hold a single stable callback
     * (via useCallback) instead of creating a new arrow per row, which would
     * defeat React.memo on this component.
     */
    onSelect: (account: Account) => void;
    onEdit: (account: Account) => void;
    onDelete: (id: string) => void;
    isDeleting?: boolean;
    isFixedExpensesAccount?: boolean;
}

/**
 * Renders a single account row in the accounts list. Wrapped in React.memo
 * so editing one account or selecting another doesn't cause every account
 * card to re-render. Handlers must be stable (useCallback in the parent)
 * for the memo to be effective.
 */
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
    const isCD = account.type === 'investment' && 'investmentType' in account && account.investmentType === 'cd';

    const balanceColor = account.balance >= 0 ? 'text-primary' : 'text-error';

    return (
        <div
            onClick={() => onSelect(account)}
            className={`glass-card p-4 cursor-pointer transition-all group relative overflow-hidden border-l-4 ${isSelected
                ? 'border-l-primary border-primary/40 bg-primary/5'
                : 'hover:bg-surface-container-high/80'
                }`}
            style={{ borderLeftColor: isSelected ? undefined : account.color }}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-4 sm:gap-0">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `${account.color}20`, color: account.color }}
                    >
                        {isInvestment ? <TrendingUp className="w-5 h-5" aria-hidden="true" /> : <Wallet className="w-5 h-5" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-on-surface truncate max-w-[200px] sm:max-w-none">{account.name}</h3>
                            {isCD && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
                                    Certificate of Deposit
                                </span>
                            )}
                            {isInvestment && !isCD && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
                                    Investments
                                </span>
                            )}
                            {isFixedExpensesAccount && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
                                    Fixed Expenses
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }} />
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{account.currency}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
                    <span className={`font-mono text-sm sm:text-lg truncate min-w-0 flex-1 sm:flex-none font-semibold ${balanceColor}`}>
                        <SelectableValue id={`acc-bal-${account.id}`} value={account.balance} currency={account.currency}>
                            {account.balance.toLocaleString(undefined, {
                                style: 'currency',
                                currency: account.currency,
                            })}
                        </SelectableValue>
                    </span>
                    <div onClick={(e) => e.stopPropagation()}>
                        <EditDeleteActions
                            onEdit={() => onEdit(account)}
                            onDelete={() => onDelete(account.id)}
                            isDeleting={isDeleting}
                            showOnHover={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(AccountCard);
