import { useMemo, Fragment } from 'react';
import type { Account, SubPocket, FixedExpenseGroup, Pocket, Currency } from '../../types';
import { currencyService } from '../../services/currencyService';
import Card from '../Card';
import ProgressBar from '../ProgressBar';
import { Wallet } from 'lucide-react';
import SelectableValue from '../SelectableValue';

interface FixedExpensesSummaryProps {
    subPockets: SubPocket[];
    groups?: FixedExpenseGroup[];
    accounts?: Account[];
    pockets?: Pocket[];
    totalMoney: number;
    primaryCurrency?: string;
}

const FixedExpensesSummary = ({
    subPockets,
    groups = [],
    accounts = [],
    pockets = [],
    totalMoney,
    primaryCurrency = 'USD',
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

    // Get unique pocket IDs present in subPockets to group by account
    const pocketIds = Array.from(new Set(subPockets.map(sp => sp.pocketId)));

    const renderExpenseRow = (subPocket: SubPocket, currency: string) => {
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
                        <span className={!subPocket.enabled ? 'line-through text-gray-500' : ''}>
                            {subPocket.name}
                        </span>
                        {!subPocket.enabled && (
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1 rounded">OFF</span>
                        )}
                    </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <SelectableValue id={`fixed-bal-${subPocket.id}`} value={subPocket.balance} currency={currency as Currency}>
                        {currencyService.formatCurrency(subPocket.balance, currency as Currency)}
                    </SelectableValue>
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <SelectableValue id={`fixed-tot-${subPocket.id}`} value={subPocket.valueTotal} currency={currency as Currency}>
                        {currencyService.formatCurrency(subPocket.valueTotal, currency as Currency)}
                    </SelectableValue>
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
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total in Fixed Expenses
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {currencyService.formatCurrency(
                        totalMoney,
                        primaryCurrency as Currency
                    )}
                </div>
            </div>

            {/* Groups & Expenses grouped by Account */}
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
                        {pocketIds.map(pocketId => {
                            const parentPocket = pockets.find(p => p.id === pocketId);
                            const parentAccount = accounts.find(a => a.id === parentPocket?.accountId);
                            const currency = parentAccount?.currency || 'USD';

                            return (
                                <Fragment key={pocketId}>
                                    {/* Account Separator */}
                                    <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                                        <td colSpan={4} className="px-4 py-1.5 border-y border-blue-100 dark:border-blue-900/30">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-2 h-2 rounded-full" 
                                                    style={{ backgroundColor: parentAccount?.color }} 
                                                />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                                    Account: {parentAccount?.name || 'Unknown'} ({currency})
                                                </span>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Groups for this pocket */}
                                    {groupedExpenses.sortedGroups.map(group => {
                                        const groupExpenses = groupedExpenses.groupsMap.get(group.id)?.filter(sp => sp.pocketId === pocketId);
                                        if (!groupExpenses?.length) return null;

                                        return (
                                            <Fragment key={group.id}>
                                                <tr className="bg-gray-50/30 dark:bg-gray-800/20">
                                                    <td colSpan={4} className="px-4 py-1">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-1.5 h-1.5 rounded-full"
                                                                style={{ backgroundColor: group.color }}
                                                            />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                                {group.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {groupExpenses.map(sp => renderExpenseRow(sp, currency))}
                                            </Fragment>
                                        );
                                    })}

                                    {/* Default Group for this pocket */}
                                    {groupedExpenses.defaultExpenses.filter(sp => sp.pocketId === pocketId).length > 0 && (
                                        <>
                                            <tr className="bg-gray-50/30 dark:bg-gray-800/20">
                                                <td colSpan={4} className="px-4 py-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 ml-3.5">
                                                        Default
                                                    </span>
                                                </td>
                                            </tr>
                                            {groupedExpenses.defaultExpenses.filter(sp => sp.pocketId === pocketId).map(sp => renderExpenseRow(sp, currency))}
                                        </>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default FixedExpensesSummary;
