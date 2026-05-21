/**
 * Net Worth Timeline Widget
 *
 * Top-level orchestrator for the net-worth timeline card. Owns the query
 * subscriptions, the per-card UI controls (view mode, date range,
 * variation toggle), the edit/delete modal state, and the click-to-edit
 * flow. Data shaping is delegated to `useNetWorthChartData` and chart
 * rendering to `NetWorthChart`.
 */

import { useState } from 'react';
import { TrendingUp, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import {
    useNetWorthSnapshotsQuery,
    useNetWorthSnapshotMutations,
} from '../../hooks/queries/useNetWorthSnapshotQueries';
import { useSettingsQuery } from '../../hooks/queries';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import {
    useNetWorthChartData,
    type NetWorthChartDatum,
    type NetWorthDateRange,
    type NetWorthViewMode,
} from '../../hooks/useNetWorthChartData';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import Modal from '../Modal';
import CurrencyAmount from '../CurrencyAmount';
import NetWorthChart from './NetWorthChart';
import type { NetWorthSnapshot } from '../../services/netWorthSnapshotService';

const NetWorthTimelineWidget = () => {
    const { data: snapshots = [], isLoading } = useNetWorthSnapshotsQuery();
    const { data: settings } = useSettingsQuery();
    const { updateMutation, deleteMutation } = useNetWorthSnapshotMutations();
    const { confirm } = useConfirmDialog();

    const [viewMode, setViewMode] = useState<NetWorthViewMode>('total');
    const [dateRange, setDateRange] = useState<NetWorthDateRange>('6m');
    const [showVariation, setShowVariation] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] =
        useState<NetWorthSnapshot | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const primaryCurrency = settings?.primaryCurrency || 'USD';

    const { chartData, currencies, tooltipFormatter } = useNetWorthChartData({
        snapshots,
        primaryCurrency,
        dateRange,
        viewMode,
        showVariation,
    });

    // Resolve the snapshot the user clicked. Prefer matching by id (the
    // canonical identifier) and fall back to the snapshot date string so
    // the click still works for legacy datums that didn't carry an id.
    const handlePointClick = (datum: NetWorthChartDatum) => {
        const snapshotId = datum.snapshotId;
        const snapshot =
            snapshots.find((s) => s.id === snapshotId) ||
            snapshots.find((s) => s.snapshotDate === datum.fullDate);

        if (snapshot) {
            setSelectedSnapshot(snapshot);
            setEditValue(snapshot.totalNetWorth.toString());
            setShowEditModal(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedSnapshot) return;

        const newValue = parseFloat(editValue);
        if (isNaN(newValue) || newValue < 0) return;

        await updateMutation.mutateAsync({
            id: selectedSnapshot.id,
            data: { totalNetWorth: newValue },
        });

        setShowEditModal(false);
    };

    const handleDelete = async () => {
        if (!selectedSnapshot) return;

        const confirmed = await confirm({
            title: 'Delete Snapshot',
            message: `Are you sure you want to delete the snapshot from ${format(
                parseISO(selectedSnapshot.snapshotDate),
                'MMM d, yyyy',
            )}?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });

        if (!confirmed) return;

        await deleteMutation.mutateAsync(selectedSnapshot.id);
        setShowEditModal(false);
    };

    if (isLoading) {
        return (
            <Card className="h-80">
                <div className="animate-pulse h-full bg-gray-100 dark:bg-gray-800 rounded" />
            </Card>
        );
    }

    if (snapshots.length === 0) {
        return (
            <Card className="h-80 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-center font-medium">No net worth data yet</p>
                <p className="text-sm text-center mt-1 opacity-75">
                    Snapshots will appear here once you start tracking
                </p>
            </Card>
        );
    }

    const latestDatum =
        chartData.length > 0 ? chartData[chartData.length - 1] : null;

    return (
        <>
            <Card>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Net Worth Timeline
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <button
                                onClick={() => setViewMode('total')}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                    viewMode === 'total'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                Total
                            </button>
                            <button
                                onClick={() => setViewMode('breakdown')}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                    viewMode === 'breakdown'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                By Currency
                            </button>
                        </div>
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex gap-2">
                        {(['30d', '6m', '1y', 'all'] as NetWorthDateRange[]).map(
                            (range) => (
                                <Button
                                    key={range}
                                    variant={dateRange === range ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setDateRange(range)}
                                >
                                    {range === '30d'
                                        ? '30 Days'
                                        : range === '6m'
                                          ? '6 Months'
                                          : range === '1y'
                                            ? '1 Year'
                                            : 'All Time'}
                                </Button>
                            ),
                        )}
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showVariation}
                            onChange={(e) => setShowVariation(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Show Variation (%)
                    </label>
                </div>

                {/* Instruction */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                    💡 Click any point on the chart to edit or delete that snapshot
                </p>

                {/* Chart */}
                <NetWorthChart
                    chartData={chartData}
                    currencies={currencies}
                    viewMode={viewMode}
                    showVariation={showVariation}
                    primaryCurrency={primaryCurrency}
                    tooltipFormatter={tooltipFormatter}
                    onPointClick={handlePointClick}
                />

                {/* Latest Value */}
                {latestDatum && viewMode === 'total' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Latest snapshot: {latestDatum.fullDate}
                            </span>
                            <CurrencyAmount
                                amount={latestDatum.total ?? 0}
                                currency={primaryCurrency}
                                locale="en-US"
                                minimumFractionDigits={0}
                                maximumFractionDigits={0}
                                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>
                )}
            </Card>

            {/* Edit Snapshot Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedSnapshot(null);
                    setEditValue('');
                }}
                title="Edit Snapshot"
                size="md"
            >
                {selectedSnapshot && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Date
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {format(
                                    parseISO(selectedSnapshot.snapshotDate),
                                    'MMMM d, yyyy',
                                )}
                            </p>
                        </div>

                        <Input
                            label="Total Net Worth"
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            step="0.01"
                            min="0"
                            required
                            className="font-mono"
                        />

                        <div className="flex justify-between gap-2 pt-4">
                            <Button
                                type="button"
                                variant="danger"
                                onClick={handleDelete}
                                loading={deleteMutation.isPending}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedSnapshot(null);
                                        setEditValue('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleSaveEdit}
                                    loading={updateMutation.isPending}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default NetWorthTimelineWidget;
