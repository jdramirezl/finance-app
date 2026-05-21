import { memo } from 'react';
import type { CDInvestmentAccount, CDCalculationResult } from '../../types';
import { EditDeleteActions } from '../ui/ActionButtons';
import { TrendingUp, Landmark, AlertTriangle } from 'lucide-react';
import SelectableValue from '../ui/SelectableValue';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';

interface CDAccountCardProps {
    account: CDInvestmentAccount;
    isSelected: boolean;
    /** Receives the account so the parent can hold a stable callback. */
    onSelect: (account: CDInvestmentAccount) => void;
    onEdit: (account: CDInvestmentAccount) => void;
    onDelete: (id: string) => void;
    isDeleting?: boolean;
}

/**
 * Renders a single Certificate of Deposit account card. Memoized so
 * editing or selecting another row does not re-trigger the (relatively
 * expensive) CD calculation for every row in the list.
 */
const CDAccountCard = ({
    account,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    isDeleting = false,
}: CDAccountCardProps) => {
    // Calculate current CD values with error handling
    let calculation: CDCalculationResult | null = null;
    let hasError = false;
    let isNearMaturity = false;

    try {
        calculation = cdCalculationService.calculateCurrentValue(account);
        isNearMaturity = cdCalculationService.isNearMaturity(account);
    } catch {
        hasError = true;
    }

    const displayBalance = hasError ? 0 : (calculation?.currentValue || 0);

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
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-tertiary/10 text-tertiary">
                        <Landmark className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-on-surface truncate max-w-[200px] sm:max-w-none">{account.name}</h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-medium whitespace-nowrap">
                                Certificate of Deposit
                            </span>
                            {isNearMaturity && !hasError && (
                                <AlertTriangle className="w-4 h-4 text-tertiary flex-shrink-0" aria-hidden="true" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }} />
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{account.currency}</span>
                            {!hasError && account.interestRate && (
                                <>
                                    <span>•</span>
                                    <span className="font-mono">{account.interestRate}% APY</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
                    <div className="flex flex-col items-end">
                        <span className="font-mono text-sm sm:text-lg truncate min-w-0 flex-1 sm:flex-none text-primary font-semibold">
                            <SelectableValue id={`cd-bal-${account.id}`} value={displayBalance} currency={account.currency}>
                                {displayBalance.toLocaleString(undefined, {
                                    style: 'currency',
                                    currency: account.currency,
                                })}
                            </SelectableValue>
                        </span>
                        {!hasError && calculation && calculation.accruedInterest > 0 && (
                            <div className="flex items-center gap-1 text-xs text-success">
                                <TrendingUp className="w-3 h-3" aria-hidden="true" />
                                <span className="font-mono">+{currencyService.formatCurrency(calculation.accruedInterest, account.currency)}</span>
                            </div>
                        )}
                    </div>
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

export default memo(CDAccountCard);
