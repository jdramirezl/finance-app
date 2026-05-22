import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PieChart, Plus } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import BudgetEntryRow, { type DistributionEntry } from './BudgetEntryRow';
import DonutChart from './DonutChart';
import { useToast } from '../../hooks/useToast';
import type { Account, Pocket } from '../../types';

interface BudgetDistributionProps {
    entries: DistributionEntry[];
    remaining: number;
    currency: string;
    primaryCurrency: string;
    showConversion: boolean;
    convertedAmounts: Map<string, number>;
    onEntriesChange: (entries: DistributionEntry[]) => void;
    /** Available pockets for linking entries. */
    pockets: Pocket[];
    /** Accounts owning the available pockets, used to derive accountId on link. */
    accounts: Account[];
}

const CHART_COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#6366f1', '#f97316', '#14b8a6', '#a855f7'
];

interface EditState {
    id: string | null;
    name: string;
    percentage: number;
    pocketId: string;
}

const EMPTY_EDIT: EditState = { id: null, name: '', percentage: 0, pocketId: '' };

const BudgetDistribution = ({
    entries,
    remaining,
    currency,
    primaryCurrency,
    showConversion,
    convertedAmounts,
    onEntriesChange,
    pockets,
    accounts,
}: BudgetDistributionProps) => {
    const toast = useToast();

    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editingEntryName, setEditingEntryName] = useState<string>('');
    const [editingEntryPercentage, setEditingEntryPercentage] = useState<number>(0);
    const [editingEntryPocketId, setEditingEntryPocketId] = useState<string>('');

    // Snapshots of the latest values + latest props. Updated post-render via
    // useEffect so handlers below can be useCallback'd with empty deps and
    // still read fresh values at call time. Without this, every keystroke
    // would re-create the handlers and break React.memo on every other row.
    const editStateRef = useRef<EditState>(EMPTY_EDIT);
    const entriesRef = useRef(entries);
    const pocketsRef = useRef(pockets);
    const onEntriesChangeRef = useRef(onEntriesChange);
    const toastRef = useRef(toast);

    useEffect(() => {
        editStateRef.current = {
            id: editingEntryId,
            name: editingEntryName,
            percentage: editingEntryPercentage,
            pocketId: editingEntryPocketId,
        };
    }, [editingEntryId, editingEntryName, editingEntryPercentage, editingEntryPocketId]);

    useEffect(() => { entriesRef.current = entries; }, [entries]);
    useEffect(() => { pocketsRef.current = pockets; }, [pockets]);
    useEffect(() => { onEntriesChangeRef.current = onEntriesChange; }, [onEntriesChange]);
    useEffect(() => { toastRef.current = toast; }, [toast]);

    // Derived totals — recompute only when entries change, not on every keystroke.
    const totalPercentage = useMemo(
        () => entries.reduce((sum, entry) => sum + entry.percentage, 0),
        [entries]
    );

    const calculateEntryAmount = useCallback(
        (percentage: number): number => {
            if (remaining <= 0) return 0;
            return (remaining * percentage) / 100;
        },
        [remaining]
    );

    const generateId = (): string => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const clearEditing = useCallback(() => {
        setEditingEntryId(null);
        setEditingEntryName('');
        setEditingEntryPercentage(0);
        setEditingEntryPocketId('');
    }, []);

    const handleAddEntry = useCallback(() => {
        const newEntry: DistributionEntry = {
            id: generateId(),
            name: '',
            percentage: 0,
        };
        onEntriesChangeRef.current([...entriesRef.current, newEntry]);
        setEditingEntryId(newEntry.id);
        setEditingEntryName('');
        setEditingEntryPercentage(0);
        setEditingEntryPocketId('');
    }, []);

    /**
     * Picking a pocket auto-fills the name when blank, so users don't have to retype it.
     */
    const handleEditPocketChange = useCallback((pocketId: string) => {
        setEditingEntryPocketId(pocketId);
        if (pocketId) {
            const pocket = pocketsRef.current.find((p) => p.id === pocketId);
            if (pocket && !editStateRef.current.name.trim()) {
                setEditingEntryName(pocket.name);
            }
        }
    }, []);

    const handleSaveEntry = useCallback((id: string) => {
        const { name, percentage, pocketId } = editStateRef.current;
        const t = toastRef.current;

        if (!name.trim()) {
            t.warning('Please enter a name for this entry');
            return;
        }

        if (percentage < 0 || percentage > 100) {
            t.warning('Percentage must be between 0 and 100');
            return;
        }

        const linkedPocket = pocketId
            ? pocketsRef.current.find((p) => p.id === pocketId)
            : undefined;

        onEntriesChangeRef.current(
            entriesRef.current.map((entry) =>
                entry.id === id
                    ? {
                        ...entry,
                        name,
                        percentage,
                        pocketId: linkedPocket?.id,
                        accountId: linkedPocket?.accountId,
                    }
                    : entry
            )
        );
        clearEditing();
    }, [clearEditing]);

    const handleDeleteEntry = useCallback((id: string) => {
        onEntriesChangeRef.current(
            entriesRef.current.filter((entry) => entry.id !== id)
        );
        if (editStateRef.current.id === id) {
            clearEditing();
        }
    }, [clearEditing]);

    const handleStartEdit = useCallback((entry: DistributionEntry) => {
        setEditingEntryId(entry.id);
        setEditingEntryName(entry.name);
        setEditingEntryPercentage(entry.percentage);
        setEditingEntryPocketId(entry.pocketId || '');
    }, []);

    // Donut chart data — filter+map runs only when entries change.
    const chartEntries = useMemo(
        () =>
            entries
                .filter((e) => e.percentage > 0)
                .map((entry, index) => ({
                    name: entry.name || 'Unnamed',
                    percentage: entry.percentage,
                    color: CHART_COLORS[index % CHART_COLORS.length],
                })),
        [entries]
    );

    return (
        <Card padding="md">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-100">Distribution</h2>
                <Button
                    variant="primary"
                    onClick={handleAddEntry}
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add Entry
                </Button>
            </div>

            {entries.length === 0 ? (
                <EmptyState
                    icon={PieChart}
                    title="No distribution entries yet"
                    description="Add an entry to start planning how to allocate your remaining budget."
                    action={{
                        label: 'Add Entry',
                        onClick: handleAddEntry,
                        icon: Plus,
                    }}
                />
            ) : (
                <div>
                    {/* Donut Chart Visualization */}
                    {chartEntries.length > 0 && (
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <DonutChart entries={chartEntries} size={220} strokeWidth={35} />
                                {/* Legend */}
                                <div className="mt-4 grid grid-cols-2 gap-2 max-w-md mx-auto">
                                    {chartEntries.map((entry, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="text-gray-400 truncate">
                                                {entry.name} ({entry.percentage.toFixed(0)}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 overflow-x-auto pb-2">
                        <div className="min-w-[700px]">
                            {/* Header */}
                            <div className={`grid ${showConversion ? 'grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr]' : 'grid-cols-12'} gap-4 pb-2 border-b border-gray-700 font-semibold text-sm text-gray-400`}>
                                <div className={showConversion ? '' : 'col-span-4'}>Name</div>
                                <div className={showConversion ? '' : 'col-span-3'}>Percentage</div>
                                <div className={showConversion ? '' : 'col-span-3'}>Amount ({currency})</div>
                                {showConversion && <div>Amount ({primaryCurrency})</div>}
                                <div className={`text-right ${showConversion ? '' : 'col-span-2'}`}>Actions</div>
                            </div>

                            {/* Entries */}
                            <div className="space-y-2 mt-2">
                                {entries.map((entry) => {
                                    const isEditing = editingEntryId === entry.id;
                                    // Only the editing row receives non-default edit values.
                                    // Non-editing rows always see '' / 0 / '' so React.memo
                                    // skips them while another row is being typed into.
                                    return (
                                        <BudgetEntryRow
                                            key={entry.id}
                                            entry={entry}
                                            amount={calculateEntryAmount(entry.percentage)}
                                            convertedAmount={convertedAmounts.get(entry.id)}
                                            currency={currency}
                                            primaryCurrency={primaryCurrency}
                                            showConversion={showConversion}
                                            isEditing={isEditing}
                                            editName={isEditing ? editingEntryName : ''}
                                            editPercentage={isEditing ? editingEntryPercentage : 0}
                                            editPocketId={isEditing ? editingEntryPocketId : ''}
                                            onEditNameChange={setEditingEntryName}
                                            onEditPercentageChange={setEditingEntryPercentage}
                                            onEditPocketChange={handleEditPocketChange}
                                            onStartEdit={handleStartEdit}
                                            onSave={handleSaveEntry}
                                            onCancel={clearEditing}
                                            onDelete={handleDeleteEntry}
                                            pockets={pockets}
                                            accounts={accounts}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Total Percentage Warning */}
                        {totalPercentage !== 100 && entries.length > 0 && (
                            <div
                                className={`mt-4 p-3 rounded-lg ${totalPercentage > 100
                                    ? 'bg-[#93000a]/10 border border-[#ffb4ab]/20 text-[#ffb4ab]'
                                    : 'bg-[#e89337]/10 border border-[#ffb873]/20 text-[#ffb873]'
                                    }`}
                            >
                                <p className="text-sm font-medium">
                                    Total percentage: {totalPercentage.toFixed(1)}%
                                    {totalPercentage > 100 && ' (exceeds 100%)'}
                                    {totalPercentage < 100 && ` (${(100 - totalPercentage).toFixed(1)}% unallocated)`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default BudgetDistribution;
