/**
 * Net Worth Timeline Widget
 * Displays a line chart of the user's net worth over time
 * Click chart points to edit snapshot values
 */

import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { useNetWorthSnapshotsQuery, useNetWorthSnapshotMutations } from '../../hooks/queries/useNetWorthSnapshotQueries';
import { useSettingsQuery } from '../../hooks/queries';
import { currencyService } from '../../services/currencyService';
import { useConfirm } from '../../hooks/useConfirm';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import { TrendingUp, Trash2 } from 'lucide-react';
import { format, parseISO, subDays, subMonths, subYears } from 'date-fns';
import type { NetWorthSnapshot } from '../../services/netWorthSnapshotService';
import type { Currency } from '../../types';

type ViewMode = 'total' | 'breakdown';
type DateRange = '30d' | '6m' | '1y' | 'all';

/**
 * Shape of a chart datum produced by `chartData`. The keys vary by mode:
 * total mode populates `total`; breakdown mode populates per-currency keys
 * (e.g. `USD`, `EUR`); variation mode also adds `<key>_original` companions.
 */
type ChartDatum = {
    date: string;
    fullDate: string;
    snapshotId: string;
    total?: number;
    total_original?: number;
} & Record<string, string | number | undefined>;

type DotProps = {
    cx?: number;
    cy?: number;
    fill?: string;
    payload?: ChartDatum;
    value?: number | null;
    // recharts passes `r` and `strokeWidth` as `string | number | undefined`
    // depending on the call site; widen to match so render callbacks type-check.
    r?: number | string;
    strokeWidth?: number | string;
};

const NetWorthTimelineWidget = () => {
    const { data: snapshots = [], isLoading } = useNetWorthSnapshotsQuery();
    const { data: settings } = useSettingsQuery();
    const { updateMutation, deleteMutation } = useNetWorthSnapshotMutations();
    const { confirm, confirmState, handleClose: handleConfirmClose, handleConfirm } = useConfirm();

    const [viewMode, setViewMode] = useState<ViewMode>('total');
    const [dateRange, setDateRange] = useState<DateRange>('6m');
    const [showVariation, setShowVariation] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<NetWorthSnapshot | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const primaryCurrency = settings?.primaryCurrency || 'USD';

    const [rates, setRates] = useState<Record<string, number>>({});

    // Handle chart point click
    const handleDotClick = (data: ChartDatum | undefined) => {
        if (!data) return;

        // Find the snapshot by snapshotId first (most reliable), then fallback to date
        const snapshotId = data.snapshotId;
        const snapshot = snapshots.find(s => s.id === snapshotId) ||
            snapshots.find(s => s.snapshotDate === data.fullDate);

        if (snapshot) {
            setSelectedSnapshot(snapshot);
            setEditValue(snapshot.totalNetWorth.toString());
            setShowEditModal(true);
        }
    };

    // Custom dot component with better hit area and visibility
    const CustomDot = (props: DotProps) => {
        const { cx, cy, fill, payload, value, r = 5, strokeWidth = 2 } = props;
        if (value === null || value === undefined) return null;
        if (cx === undefined || cy === undefined) return null;

        return (
            <g
                className="cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    handleDotClick(payload);
                }}
            >
                {/* Larger transparent hit area */}
                <circle cx={cx} cy={cy} r={12} fill="transparent" />
                {/* Visible dot */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={strokeWidth}
                    className="transition-all duration-200"
                    style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}
                />
            </g>
        );
    };

    // Handle save edit
    const handleSaveEdit = async () => {
        if (!selectedSnapshot) return;

        const newValue = parseFloat(editValue);

        if (isNaN(newValue) || newValue < 0) {
            return;
        }

        await updateMutation.mutateAsync({
            id: selectedSnapshot.id,
            data: { totalNetWorth: newValue }
        });

        setShowEditModal(false);
    };

    // Handle delete
    const handleDelete = async () => {
        if (!selectedSnapshot) return;

        const confirmed = await confirm({
            title: 'Delete Snapshot',
            message: `Are you sure you want to delete the snapshot from ${format(parseISO(selectedSnapshot.snapshotDate), 'MMM d, yyyy')}?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });

        if (!confirmed) return;

        await deleteMutation.mutateAsync(selectedSnapshot.id);
        setShowEditModal(false);
    };

    // Filter snapshots by date range
    const filteredSnapshots = useMemo(() => {
        if (snapshots.length === 0) return [];

        const now = new Date();
        let startDate: Date;

        switch (dateRange) {
            case '30d':
                startDate = subDays(now, 30);
                break;
            case '6m':
                startDate = subMonths(now, 6);
                break;
            case '1y':
                startDate = subYears(now, 1);
                break;
            case 'all':
            default:
                startDate = new Date(0);
                break;
        }

        return snapshots.filter(s => parseISO(s.snapshotDate) >= startDate);
    }, [snapshots, dateRange]);

    // Get all unique currencies from breakdown
    const currencies = useMemo(() => {
        const allCurrencies = new Set<string>();
        snapshots.forEach(s => {
            Object.keys(s.breakdown || {}).forEach(c => allCurrencies.add(c));
        });
        return Array.from(allCurrencies);
    }, [snapshots]);

    // Fetch exchange rates
    useEffect(() => {
        const fetchRates = async () => {
            const newRates: Record<string, number> = {};

            const promises = currencies.map(async (currency) => {
                if (currency === primaryCurrency) {
                    newRates[currency] = 1;
                } else {
                    try {
                        const rate = await currencyService.getExchangeRateAsync(
                            currency as Currency,
                            primaryCurrency as Currency
                        );
                        newRates[currency] = rate;
                    } catch {
                        newRates[currency] = currencyService.getExchangeRate(
                            currency as Currency,
                            primaryCurrency as Currency
                        );
                    }
                }
            });

            await Promise.all(promises);
            setRates(newRates);
        };

        if (currencies.length > 0) {
            fetchRates();
        }
    }, [currencies, primaryCurrency]);

    // Color palette for currencies
    const currencyColors: Record<string, string> = {
        USD: '#22c55e',
        EUR: '#3b82f6',
        GBP: '#a855f7',
        MXN: '#f97316',
        COP: '#eab308',
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: primaryCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Prepare chart data
    const chartData = useMemo<ChartDatum[]>(() => {
        if (filteredSnapshots.length === 0) return [];
        const hasForeignCurrency = currencies.some(c => c !== primaryCurrency);
        if (hasForeignCurrency && Object.keys(rates).length === 0) return [];

        const processedSnapshots: ChartDatum[] = filteredSnapshots.map(snapshot => {
            const data: ChartDatum = {
                date: format(parseISO(snapshot.snapshotDate), 'MMM d'),
                fullDate: snapshot.snapshotDate,
                total: snapshot.totalNetWorth,
                snapshotId: snapshot.id,
            };

            if (snapshot.breakdown) {
                Object.entries(snapshot.breakdown).forEach(([currency, value]) => {
                    const rate = rates[currency] || 1;
                    data[currency] = currency === primaryCurrency ? value : value * rate;
                });
            }
            return data;
        });

        if (showVariation && processedSnapshots.length > 0) {
            const baseline = processedSnapshots[0];
            const baselineTotal = baseline.total ?? 0;
            return processedSnapshots.map(snapshot => {
                const snapshotTotal = snapshot.total ?? 0;
                const variationData: ChartDatum = {
                    date: snapshot.date,
                    fullDate: snapshot.fullDate,
                    snapshotId: snapshot.snapshotId,
                    total: baselineTotal !== 0
                        ? ((snapshotTotal - baselineTotal) / Math.abs(baselineTotal)) * 100
                        : 0,
                    total_original: snapshotTotal,
                };

                if (viewMode === 'breakdown') {
                    currencies.forEach(currency => {
                        const baseVal = (baseline[currency] as number | undefined) ?? 0;
                        const currentVal = (snapshot[currency] as number | undefined) ?? 0;
                        variationData[currency] = baseVal !== 0
                            ? ((currentVal - baseVal) / Math.abs(baseVal)) * 100
                            : 0;
                        variationData[`${currency}_original`] = currentVal;
                    });
                }

                return variationData;
            });
        }

        return processedSnapshots;
    }, [filteredSnapshots, viewMode, showVariation, primaryCurrency, currencies, rates]);

    type CustomTooltipFormatter = NonNullable<TooltipProps<number, string>['formatter']>;

    const tooltipFormatter: CustomTooltipFormatter = (value, name, entry) => {
        const displayName = name != null ? String(name) : 'Value';
        if (value === undefined || value === null) return ['N/A', displayName];
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(numValue)) return ['N/A', displayName];
        if (showVariation) {
            const originalKey = displayName === 'Net Worth' ? 'total_original' : `${displayName}_original`;
            const payload = (entry as { payload?: ChartDatum })?.payload;
            const originalValue = payload ? (payload[originalKey] as number | undefined) : undefined;
            return [
                `${numValue.toFixed(2)}% (${originalValue !== undefined ? formatCurrency(originalValue) : 'N/A'})`,
                displayName,
            ];
        }
        return [formatCurrency(numValue), displayName];
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
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'total'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Total
                            </button>
                            <button
                                onClick={() => setViewMode('breakdown')}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'breakdown'
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
                        {(['30d', '6m', '1y', 'all'] as DateRange[]).map(range => (
                            <Button
                                key={range}
                                variant={dateRange === range ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setDateRange(range)}
                            >
                                {range === '30d' ? '30 Days' : range === '6m' ? '6 Months' : range === '1y' ? '1 Year' : 'All Time'}
                            </Button>
                        ))}
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
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                className="text-gray-600 dark:text-gray-400"
                            />
                            <YAxis
                                tickFormatter={(value) => showVariation ? `${value.toFixed(0)}%` : formatCurrency(value)}
                                tick={{ fontSize: 12 }}
                                width={showVariation ? 50 : 80}
                                className="text-gray-600 dark:text-gray-400"
                                domain={showVariation ? [-100, 100] : ['auto', 'auto']}
                            />
                            <Tooltip
                                formatter={tooltipFormatter}
                                labelFormatter={(label) => `Date: ${label}`}
                                contentStyle={{
                                    backgroundColor: 'var(--tooltip-bg, #fff)',
                                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />

                            {viewMode === 'total' ? (
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    name="Net Worth"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={<CustomDot />}
                                    activeDot={<CustomDot r={8} strokeWidth={3} />}
                                />
                            ) : (
                                currencies.map(currency => (
                                    <Line
                                        key={currency}
                                        type="monotone"
                                        dataKey={currency}
                                        name={currency}
                                        stroke={currencyColors[currency] || '#8884d8'}
                                        strokeWidth={2}
                                        dot={(props: DotProps) => <CustomDot {...props} fill={currencyColors[currency] || '#8884d8'} />}
                                        activeDot={(props: DotProps) => <CustomDot {...props} fill={currencyColors[currency] || '#8884d8'} r={8} strokeWidth={3} />}
                                    />
                                ))
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Latest Value */}
                {chartData.length > 0 && viewMode === 'total' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Latest snapshot: {chartData[chartData.length - 1].fullDate}
                            </span>
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(chartData[chartData.length - 1].total ?? 0)}
                            </span>
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
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {format(parseISO(selectedSnapshot.snapshotDate), 'MMMM d, yyyy')}
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

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                variant={confirmState.variant}
                onConfirm={handleConfirm}
                onClose={handleConfirmClose}
            />
        </>
    );
};

export default NetWorthTimelineWidget;
