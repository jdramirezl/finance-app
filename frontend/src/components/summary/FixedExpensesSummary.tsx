import type { Account, SubPocket } from '../../types';
import { currencyService } from '../../services/currencyService';
import Card from '../Card';
import ProgressBar from '../ProgressBar';

interface FixedExpensesSummaryProps {
    subPockets: SubPocket[];
    account?: Account;
    totalMoney: number;
}

const FixedExpensesSummary = ({
    subPockets,
    account,
    totalMoney,
}: FixedExpensesSummaryProps) => {
    if (!subPockets.length) {
        return (
            <Card>
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No fixed expenses yet
                </div>
            </Card>
        );
    }

    return (
        <Card>
            {/* Total Summary */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total in Fixed Expenses
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {currencyService.formatCurrency(
                        totalMoney,
                        account?.currency || 'USD'
                    )}
                </div>
            </div>

            {/* Fixed Expenses Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-600">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Contributed
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Target
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Progress
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {subPockets.map((subPocket) => {
                            const progress = subPocket.valueTotal > 0
                                ? Math.min((subPocket.balance / subPocket.valueTotal) * 100, 100)
                                : 0;
                            const isDisabled = !subPocket.enabled;

                            return (
                                <tr
                                    key={subPocket.id}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${isDisabled ? 'opacity-50' : ''}`}
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                        <div className="flex items-center gap-2">
                                            <span className={isDisabled ? 'line-through' : ''}>
                                                {subPocket.name}
                                            </span>
                                            {isDisabled && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                        {currencyService.formatCurrency(
                                            subPocket.balance,
                                            account?.currency || 'USD'
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                        {currencyService.formatCurrency(
                                            subPocket.valueTotal,
                                            account?.currency || 'USD'
                                        )}
                                    </td>
                                    <td className="px-4 py-3 min-w-[140px]">
                                        <ProgressBar value={progress} showLabel size="sm" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default FixedExpensesSummary;
