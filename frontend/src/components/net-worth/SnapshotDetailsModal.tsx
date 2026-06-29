/**
 * Net Worth Snapshot Details Modal
 *
 * Read-only view of a single net-worth snapshot. Opened by clicking
 * any point on the timeline chart. Shows the date, total, per-currency
 * breakdown, and the delta from the previous snapshot. Includes an
 * `Edit` button that hands off to the existing `NetWorthEditModal` so
 * the user can change values from here without losing context.
 *
 * Exposes an imperative `open(snapshot, previousSnapshot?)` handle
 * mirroring the pattern used by `NetWorthEditModal`, so parent
 * components don't need to thread isOpen/onClose props through the
 * tree.
 */

import { forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CurrencyAmount from '../ui/CurrencyAmount';
import type { NetWorthSnapshot } from '../../services/netWorthSnapshotService';

export interface SnapshotDetailsModalHandle {
    /**
     * Open the modal with the given snapshot. Pass the immediately
     * preceding snapshot (by date) when available so the modal can
     * render a "Δ from previous" line. Pass `null` when there is no
     * earlier snapshot.
     */
    open: (
        snapshot: NetWorthSnapshot,
        previousSnapshot: NetWorthSnapshot | null,
    ) => void;
}

export interface SnapshotDetailsModalProps {
    /**
     * Invoked when the user clicks the Edit button. Receives the
     * snapshot currently shown in the modal. The modal closes itself
     * before invoking the callback so the parent can immediately open
     * the edit modal without focus-trap conflicts.
     */
    onEdit: (snapshot: NetWorthSnapshot) => void;
    /**
     * The user's primary currency, used to label the headline total.
     * Per-currency rows in the breakdown render in their own currency.
     */
    primaryCurrency: string;
}

const formatSnapshotDate = (iso: string): string => {
    try {
        return format(parseISO(iso), 'MMM d, yyyy');
    } catch {
        return iso;
    }
};

const SnapshotDetailsModal = forwardRef<
    SnapshotDetailsModalHandle,
    SnapshotDetailsModalProps
>(({ onEdit, primaryCurrency }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [snapshot, setSnapshot] = useState<NetWorthSnapshot | null>(null);
    const [previousSnapshot, setPreviousSnapshot] =
        useState<NetWorthSnapshot | null>(null);

    useImperativeHandle(
        ref,
        () => ({
            open: (next, previous) => {
                setSnapshot(next);
                setPreviousSnapshot(previous);
                setIsOpen(true);
            },
        }),
        [],
    );

    const close = () => setIsOpen(false);

    // Computed delta vs the previous snapshot in the user's primary
    // currency. Null when there's nothing to compare against — the
    // headline row stays clean for the very first snapshot.
    const delta = useMemo(() => {
        if (!snapshot || !previousSnapshot) return null;
        const value = snapshot.totalNetWorth - previousSnapshot.totalNetWorth;
        if (!Number.isFinite(value)) return null;
        const percent =
            previousSnapshot.totalNetWorth !== 0
                ? (value / Math.abs(previousSnapshot.totalNetWorth)) * 100
                : null;
        return { value, percent };
    }, [snapshot, previousSnapshot]);

    // Breakdown rows sorted alphabetically by currency code so the
    // visual order is stable regardless of how the snapshot was
    // populated upstream.
    const breakdownRows = useMemo(() => {
        if (!snapshot?.breakdown) return [];
        return Object.entries(snapshot.breakdown)
            .filter(([, amount]) => Number.isFinite(amount))
            .sort(([a], [b]) => a.localeCompare(b));
    }, [snapshot]);

    if (!snapshot) {
        return (
            <Modal isOpen={isOpen} onClose={close} title="Snapshot details">
                <div className="text-sm text-gray-400">
                    No snapshot selected.
                </div>
            </Modal>
        );
    }

    const deltaColor = !delta
        ? ''
        : delta.value > 0
            ? 'text-emerald-400'
            : delta.value < 0
                ? 'text-rose-400'
                : 'text-gray-400';

    const handleEditClick = () => {
        const current = snapshot;
        // Close first so the focus trap releases, then bubble. The
        // parent will open the edit modal on the next microtask, which
        // is after React has flushed the close.
        setIsOpen(false);
        queueMicrotask(() => onEdit(current));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={close}
            title={`Snapshot · ${formatSnapshotDate(snapshot.snapshotDate)}`}
            size="md"
        >
            <div className="space-y-5" data-testid="snapshot-details-modal-body">
                <div className="flex items-baseline justify-between">
                    <span className="text-sm uppercase tracking-wide text-gray-400">
                        Total
                    </span>
                    <div className="text-right">
                        <CurrencyAmount
                            amount={snapshot.totalNetWorth}
                            currency={primaryCurrency}
                            locale="en-US"
                            minimumFractionDigits={0}
                            maximumFractionDigits={0}
                            className="text-xl font-semibold text-gray-100"
                        />
                        {delta && (
                            <div
                                className={`text-xs mt-0.5 ${deltaColor}`}
                                data-testid="snapshot-details-delta"
                            >
                                {delta.value >= 0 ? '+' : '−'}
                                <CurrencyAmount
                                    amount={Math.abs(delta.value)}
                                    currency={primaryCurrency}
                                    locale="en-US"
                                    minimumFractionDigits={0}
                                    maximumFractionDigits={0}
                                />
                                {delta.percent != null && (
                                    <>
                                        {' '}
                                        ({delta.value >= 0 ? '+' : '−'}
                                        {Math.abs(delta.percent).toFixed(1)}%)
                                    </>
                                )}
                                <span className="text-gray-500"> vs prev</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="text-sm uppercase tracking-wide text-gray-400 mb-2">
                        By currency
                    </div>
                    {breakdownRows.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">
                            No per-currency breakdown stored for this snapshot.
                        </div>
                    ) : (
                        <table
                            className="w-full text-sm"
                            data-testid="snapshot-details-breakdown"
                        >
                            <tbody>
                                {breakdownRows.map(([currency, amount]) => (
                                    <tr
                                        key={currency}
                                        className="border-b border-gray-700/50 last:border-b-0"
                                    >
                                        <td className="py-1.5 text-gray-300">
                                            {currency}
                                        </td>
                                        <td className="py-1.5 text-right font-mono tabular-nums text-gray-100">
                                            <CurrencyAmount
                                                amount={amount}
                                                currency={currency}
                                                locale="en-US"
                                                minimumFractionDigits={0}
                                                maximumFractionDigits={0}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700">
                    <Button type="button" variant="secondary" onClick={close}>
                        Close
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleEditClick}
                        data-testid="snapshot-details-edit"
                    >
                        Edit
                    </Button>
                </div>
            </div>
        </Modal>
    );
});

SnapshotDetailsModal.displayName = 'SnapshotDetailsModal';

export default SnapshotDetailsModal;
