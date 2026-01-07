import type { CDInvestmentAccount } from '../../types';
import { EditDeleteActions } from '../ActionButtons';
import { TrendingUp, Landmark, AlertTriangle } from 'lucide-react';
import SelectableValue from '../SelectableValue';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';

interface CDAccountCardProps {
    account: CDInvestmentAccount;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
}

const CDAccountCard = ({
    account,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    isDeleting = false,
}: CDAccountCardProps) => {
    // Calculate current CD values with error handling
    let calculation: any = null;
    let hasError = false;
    let isNearMaturity = false;
    
    try {
        calculation = cdCalculationService.calculateCurrentValue(account);
        isNearMaturity = cdCalculationService.isNearMaturity(account);
    } catch (error) {
        console.error('❌ Failed to calculate CD values in CDAccountCard:', error);
        hasError = true;
    }

    // Get display balance - use calculated current value or show error
    const displayBalance = hasError ? 0 : (calculation?.currentValue || 0);

    return (
        <div
            onClick={onSelect}
            className={`p-4 bg-white dark:bg-gray-800 rounded-lg border-2 cursor-pointer transition-all group relative overflow-hidden ${isSelected
                ? 'border-blue-500 dark:border-blue-400 shadow-md'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } bg-gradient-to-r from-white to-amber-50 dark:from-gray-800 dark:to-amber-900/10`}
        >
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-bl-full -mr-8 -mt-8 z-0" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-4 sm:gap-0">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <Landmark className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">{account.name}</h3>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                                Certificate of Deposit
                            </span>
                            {isNearMaturity && !hasError && (
                                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }} />
                            <span>{account.currency}</span>
                            {!hasError && account.interestRate && (
                                <>
                                    <span>•</span>
                                    <span>{account.interestRate}% APY</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
                    <div className="flex flex-col items-end">
                        <span className="font-mono text-sm sm:text-lg truncate min-w-0 flex-1 sm:flex-none text-amber-700 dark:text-amber-300 font-bold">
                            <SelectableValue id={`cd-bal-${account.id}`} value={displayBalance} currency={account.currency}>
                                {displayBalance.toLocaleString(undefined, {
                                    style: 'currency',
                                    currency: account.currency,
                                })}
                            </SelectableValue>
                        </span>
                        {!hasError && calculation && calculation.accruedInterest > 0 && (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <TrendingUp className="w-3 h-3" />
                                <span>+{currencyService.formatCurrency(calculation.accruedInterest, account.currency)}</span>
                            </div>
                        )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                        <EditDeleteActions
                            onEdit={onEdit}
                            onDelete={onDelete}
                            isDeleting={isDeleting}
                            showOnHover={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CDAccountCard;