import { useMemo, Fragment } from 'react';
import type { Account, SubPocket, FixedExpenseGroup } from '../../types';
import { currencyService } from '../../services/currencyService';
import Card from '../Card';
import ProgressBar from '../ProgressBar';
import { Wallet } from 'lucide-react';

interface FixedExpensesSummaryProps {
    subPockets: SubPocket[];
    groups?: FixedExpenseGroup[];
    account?: Account;
    totalMoney: number;
}

const FixedExpensesSummary = ({
    subPockets,
    groups = [],
    account,
    totalMoney,
}: FixedExpensesSummaryProps) => {
    // Group expenses logic
    const groupedExpenses = useMemo(() => {
        const groupsMap = new Map<string, SubPocket[]>(); // groupId -> expenses
        const defaultExpenses: SubPocket[] = [];

        subPockets.forEach(sp => {
            if (sp.groupId) {
                const current = groupsMap.get(sp.groupId) || [];
                current.push(sp);
                groupsMap.set(sp.groupId, current);
            } else {
                defaultExpenses.push(sp);
            }
        });

        // Sort groups by displayOrder
        const sortedGroups = [...groups].sort((a, b) => a.displayOrder - b.displayOrder);

        return {
            sortedGroups,
            groupsMap,
            defaultExpenses
        };
    }, [subPockets, groups]);

    if (!subPockets.length) {
        return (
            <Card>
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No fixed expenses yet
                </div>
            </Card>
        );
    }

    const renderExpenseRow = (subPocket: SubPocket) => {
        const progress = subPocket.valueTotal > 0
            ? Math.min((subPocket.balance / subPocket.valueTotal) * 100, 100)
            : 0;


        return (
            <tr
                key={subPocket.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
            >
                <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                        <span>
                            {subPocket.name}
                        </span>
                    </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {currencyService.formatCurrency(
                        subPocket.balance,
                        account?.currency || 'USD'
                    )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {currencyService.formatCurrency(
                        subPocket.valueTotal,
                        account?.currency || 'USD'
                    )}
                </td>
                <td className="px-4 py-2 min-w-[100px]">
                    <ProgressBar value={progress} showLabel size="sm" />
                </td>
            </tr>
        );
    };

    return (
        <Card>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Fixed Expenses
                </h3>
            </div>

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

            {/* Groups & Expenses */}
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
                        {/* Render Groups */}
                        {groupedExpenses.sortedGroups.map(group => {
                            const groupExpenses = groupedExpenses.groupsMap.get(group.id);
                            if (!groupExpenses?.length) return null;

                            return (
                                <Fragment key={group.id}>
                                    {/* Group Header */}
                                    <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                                        <td colSpan={4} className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: group.color }}
                                                />
                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                    {group.name}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Group Expenses */}
                                    {groupExpenses.map(renderExpenseRow)}
                                </Fragment>
                            );
                        })}

                        {/* Render Default Group if it has items */}
                        {groupedExpenses.defaultExpenses.length > 0 && (
                            <>
                                {groupedExpenses.sortedGroups.length > 0 && (
                                    <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                                        <td colSpan={4} className="px-4 py-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Default
                                            </span>
                                        </td>
                                    </tr>
                                )}
                                {groupedExpenses.defaultExpenses.map(renderExpenseRow)}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default FixedExpensesSummary;
