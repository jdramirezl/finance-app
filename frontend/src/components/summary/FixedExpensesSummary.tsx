import { useMemo, Fragment } from 'react';
import type { Account, SubPocket, FixedExpenseGroup, Pocket, Currency } from '../../types';
import { currencyService } from '../../services/currencyService';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import { Wallet } from 'lucide-react';
import SelectableValue from '../ui/SelectableValue';

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
                <div className="p-8 text-center text-on-surface-variant">
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
                className="hover:bg-surface-container-high/30"
            >
                <td className="px-4 py-2 text-sm font-medium text-on-surface">
                    <div className="flex items-center gap-2">
                        <span className={!subPocket.enabled ? 'line-through text-on-surface-variant' : ''}>
                            {subPocket.name}
                        </span>
                        {!subPocket.enabled && (
                            <span className="text-[11px] bg-surface-container-highest text-on-surface-variant px-1 rounded">OFF</span>
                        )}
                    </div>
                </td>
                <td className="px-4 py-2 text-sm font-mono text-on-surface-variant">
                    <SelectableValue id={`fixed-bal-${subPocket.id}`} value={subPocket.balance} currency={currency as Currency}>
                        {currencyService.formatCurrency(subPocket.balance, currency as Currency)}
                    </SelectableValue>
                </td>
                <td className="px-4 py-2 text-sm font-mono text-on-surface-variant">
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
                <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Fixed Expenses
                </h3>
            </div>

            {/* Total Summary */}
            <div className="mb-6 p-4 bg-surface-container-high/50 rounded-lg border border-outline-variant">
                <div className="text-sm text-on-surface-variant mb-1 uppercase tracking-wider">
                    Total in Fixed Expenses
                </div>
                <div className="text-2xl font-bold font-mono text-on-surface">
                    {currencyService.formatCurrency(
                        totalMoney,
                        primaryCurrency as Currency
                    )}
                </div>
            </div>

            {/* Groups & Expenses grouped by Account */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                    <thead className="bg-surface-container-high/50 border-b border-outline-variant">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                Contributed
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                Target
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                Progress
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                        {pocketIds.map(pocketId => {
                            const parentPocket = pockets.find(p => p.id === pocketId);
                            const parentAccount = accounts.find(a => a.id === parentPocket?.accountId);
                            const currency = parentAccount?.currency || 'USD';
                            
                            // Calculate total for this account (pocket)
                            const accountTotal = subPockets
                                .filter(sp => sp.pocketId === pocketId)
                                .reduce((sum, sp) => sum + sp.balance, 0);

                            return (
                                <Fragment key={pocketId}>
                                    {/* Account Separator */}
                                    <tr className="bg-primary/5">
                                        <td colSpan={4} className="px-4 py-1.5 border-y border-primary/20">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="w-2 h-2 rounded-full" 
                                                        style={{ backgroundColor: parentAccount?.color }} 
                                                    />
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                                                        Account: {parentAccount?.name || 'Unknown'} ({currency})
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-bold font-mono text-primary">
                                                    Account Total: {currencyService.formatCurrency(accountTotal, currency as Currency)}
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
                                                <tr className="bg-surface-container/30">
                                                    <td colSpan={4} className="px-4 py-1">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-1.5 h-1.5 rounded-full"
                                                                    style={{ backgroundColor: group.color }}
                                                                />
                                                                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                                                                    {group.name}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] font-bold font-mono text-on-surface-variant">
                                                                Group Total: {currencyService.formatCurrency(
                                                                    groupExpenses.reduce((sum, sp) => sum + sp.balance, 0), 
                                                                    currency as Currency
                                                                )}
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
                                            <tr className="bg-surface-container/30">
                                                <td colSpan={4} className="px-4 py-1">
                                                    <div className="flex items-center justify-between ml-3.5">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                                                            Default
                                                        </span>
                                                        <span className="text-[11px] font-bold font-mono text-on-surface-variant">
                                                            Total: {currencyService.formatCurrency(
                                                                groupedExpenses.defaultExpenses
                                                                    .filter(sp => sp.pocketId === pocketId)
                                                                    .reduce((sum, sp) => sum + sp.balance, 0),
                                                                currency as Currency
                                                            )}
                                                        </span>
                                                    </div>
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
