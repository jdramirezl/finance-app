import { useState, useMemo } from 'react';
import type { SubPocket, FixedExpenseGroup, Currency } from '../../types';
import Button from '../Button';
import Input from '../Input';
import { currencyService } from '../../services/currencyService';

export interface PlanningScenario {
    id: string;
    name: string;
    expenseIds: string[];
    deductSaved?: boolean;
}

interface ScenarioFormProps {
    initialData?: PlanningScenario | null;
    fixedSubPockets: SubPocket[];
    fixedExpenseGroups: FixedExpenseGroup[];
    currency: Currency;
    onSave: (scenario: PlanningScenario) => void;
    onCancel: () => void;
}

const ScenarioForm = ({
    initialData,
    fixedSubPockets,
    fixedExpenseGroups,
    currency,
    onSave,
    onCancel
}: ScenarioFormProps) => {
    const [name, setName] = useState(initialData?.name || '');
    const [deductSaved, setDeductSaved] = useState(initialData?.deductSaved || false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(initialData?.expenseIds || [])
    );

    // Group expenses for easier selection
    const groupedExpenses = useMemo(() => {
        const groupsMap = new Map<string, SubPocket[]>(); // groupId -> expenses
        const defaultExpenses: SubPocket[] = [];

        fixedSubPockets.forEach(sp => {
            if (sp.groupId) {
                const current = groupsMap.get(sp.groupId) || [];
                current.push(sp);
                groupsMap.set(sp.groupId, current);
            } else {
                defaultExpenses.push(sp);
            }
        });

        const sortedGroups = [...fixedExpenseGroups].sort((a, b) => a.displayOrder - b.displayOrder);

        return { sortedGroups, groupsMap, defaultExpenses };
    }, [fixedSubPockets, fixedExpenseGroups]);

    const toggleExpense = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleGroup = (groupId: string | 'default') => {
        const groupExpenses = groupId === 'default'
            ? groupedExpenses.defaultExpenses
            : groupedExpenses.groupsMap.get(groupId) || [];

        const allSelected = groupExpenses.every(sp => selectedIds.has(sp.id));

        const newSet = new Set(selectedIds);
        groupExpenses.forEach(sp => {
            if (allSelected) {
                newSet.delete(sp.id);
            } else {
                newSet.add(sp.id);
            }
        });
        setSelectedIds(newSet);
    };

    const calculateTotal = () => {
        return fixedSubPockets
            .filter(sp => selectedIds.has(sp.id))
            .reduce((sum, sp) => {
                const aporteMensual = sp.valueTotal / sp.periodicityMonths;
                if (deductSaved && sp.balance > 0) {
                    const reduced = Math.max(0, aporteMensual - sp.balance);
                    // Note: We don't check 'remaining' here for simplicity in the form preview, 
                    // but it gives a good estimate.
                    return sum + reduced;
                }
                return sum + aporteMensual;
            }, 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        onSave({
            id: initialData?.id || crypto.randomUUID(),
            name,
            deductSaved,
            expenseIds: Array.from(selectedIds)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {initialData ? 'Edit Scenario' : 'New Scenario'}
                </h2>
                <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Monthly</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {currencyService.formatCurrency(calculateTotal(), currency)}
                    </div>
                </div>
            </div>

            <Input
                label="Scenario Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bare Minimum, Luxury..."
                required
            />

            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <input
                    type="checkbox"
                    id="deductSaved"
                    checked={deductSaved}
                    onChange={(e) => setDeductSaved(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="deductSaved" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Deduct saved amounts from required monthly total
                </label>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 border rounded-lg p-2 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b dark:border-gray-700 z-10">
                    Select Expenses to Include
                </div>

                {groupedExpenses.sortedGroups.map(group => {
                    const expenses = groupedExpenses.groupsMap.get(group.id);
                    if (!expenses?.length) return null;
                    const allSelected = expenses.every(sp => selectedIds.has(sp.id));

                    return (
                        <div key={group.id} className="space-y-1">
                            <div
                                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => toggleGroup(group.id)}
                            >
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    readOnly
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                />
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: group.color }}
                                />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    {group.name}
                                </span>
                                <span className="text-xs text-gray-500 ml-auto">
                                    ({expenses.length})
                                </span>
                            </div>
                            <div className="pl-6 space-y-1">
                                {expenses.map(sp => (
                                    <label key={sp.id} className="flex items-center justify-between p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(sp.id)}
                                                onChange={() => toggleExpense(sp.id)}
                                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {sp.name}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {currencyService.formatCurrency(sp.valueTotal / sp.periodicityMonths, currency)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {groupedExpenses.defaultExpenses.length > 0 && (
                    <div className="space-y-1">
                        <div
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => toggleGroup('default')}
                        >
                            <input
                                type="checkbox"
                                checked={groupedExpenses.defaultExpenses.every(sp => selectedIds.has(sp.id))}
                                readOnly
                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                Default
                            </span>
                            <span className="text-xs text-gray-500 ml-auto">
                                ({groupedExpenses.defaultExpenses.length})
                            </span>
                        </div>
                        <div className="pl-6 space-y-1">
                            {groupedExpenses.defaultExpenses.map(sp => (
                                <label key={sp.id} className="flex items-center justify-between p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(sp.id)}
                                            onChange={() => toggleExpense(sp.id)}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {sp.name}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {currencyService.formatCurrency(sp.valueTotal / sp.periodicityMonths, currency)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <Button variant="ghost" onClick={onCancel} type="button">
                    Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={!name.trim()}>
                    Save Scenario
                </Button>
            </div>
        </form>
    );
};

export default ScenarioForm;
