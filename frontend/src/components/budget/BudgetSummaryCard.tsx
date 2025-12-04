import Card from '../Card';

interface BudgetSummaryCardProps {
    initialAmount: number;
    totalFixedExpenses: number;
    remaining: number;
    currency: string;
}

const BudgetSummaryCard = ({
    initialAmount,
    totalFixedExpenses,
    remaining,
    currency,
}: BudgetSummaryCardProps) => {
    return (
        <Card padding="md" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Initial Amount:</span>
                <span className="text-xl font-bold text-blue-900 dark:text-blue-200">
                    {initialAmount.toLocaleString(undefined, {
                        style: 'currency',
                        currency,
                    })}
                </span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Fixed Expenses:</span>
                <span className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                    - {totalFixedExpenses.toLocaleString(undefined, {
                        style: 'currency',
                        currency,
                    })}
                </span>
            </div>
            <div className="border-t border-blue-300 dark:border-blue-700 pt-3">
                <div className="flex items-center justify-between">
                    <span className="text-gray-800 dark:text-gray-200 font-bold text-lg">Remaining:</span>
                    <span
                        className={`text-2xl font-bold ${remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}
                    >
                        {remaining.toLocaleString(undefined, {
                            style: 'currency',
                            currency,
                        })}
                    </span>
                </div>
            </div>
        </Card>
    );
};

export default BudgetSummaryCard;
