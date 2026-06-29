/**
 * Net Worth Snapshots Table Modal
 *
 * Opened by the "Edit Snapshots" button in the net-worth widget
 * header. Renders every saved snapshot as a row in a sortable table —
 * date, total in the primary currency, and one column per currency
 * actually used across the dataset, plus a per-row Edit action that
 * hands off to the existing `NetWorthEditModal` via the `onEdit`
 * callback so power users can sweep through and fix wrong values
 * without leaving the page.
 *
 * Read-only by design — inline editing per cell would require its own
 * form-state and validation surface, and the existing single-snapshot
 * edit modal already covers that flow cleanly. This component is the
 * navigation aid that surfaces all data at once.
 */

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, X } from 'lucide-react';
import Modal from '../ui/Modal';
import CurrencyAmount from '../ui/CurrencyAmount';
import type { NetWorthSnapshot } from '../../services/netWorthSnapshotService';

export interface SnapshotsTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    snapshots: NetWorthSnapshot[];
    /**
     * Called when the user clicks Edit on a row. The modal closes
     * itself before invoking so focus traps don't conflict with the
     * edit modal opening immediately after.
     */
    onEdit: (snapshot: NetWorthSnapshot) => void;
    primaryCurrency: string;
}

type SortDirection = 'asc' | 'desc';

const formatRowDate = (iso: string): string => {
    try {
        return format(parseISO(iso), 'yyyy-MM-dd');
    } catch {
        return iso;
    }
};

const SnapshotsTableModal = ({
    isOpen,
    onClose,
    snapshots,
    onEdit,
    primaryCurrency,
}: SnapshotsTableModalProps) => {
    // Default to newest-first since users overwhelmingly want to see
    // their latest snapshots when opening the table.
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    // Collect the set of currencies that actually appear in the
    // breakdowns and render one column per. Without this we'd either
    // hardcode currencies or render empty columns for ones the user
    // doesn't use.
    const currencyColumns = useMemo(() => {
        const set = new Set<string>();
        for (const s of snapshots) {
            for (const cur of Object.keys(s.breakdown ?? {})) {
                set.add(cur);
            }
        }
        // Pin the primary currency to the front so it reads naturally,
        // then alphabetize the rest.
        const all = Array.from(set);
        const primary = all.filter((c) => c === primaryCurrency);
        const others = all
            .filter((c) => c !== primaryCurrency)
            .sort((a, b) => a.localeCompare(b));
        return [...primary, ...others];
    }, [snapshots, primaryCurrency]);

    const sortedSnapshots = useMemo(() => {
        const copy = [...snapshots];
        copy.sort((a, b) => {
            const ta = new Date(a.snapshotDate).getTime();
            const tb = new Date(b.snapshotDate).getTime();
            return sortDir === 'desc' ? tb - ta : ta - tb;
        });
        return copy;
    }, [snapshots, sortDir]);

    const toggleSortDir = () =>
        setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));

    const handleEditClick = (snapshot: NetWorthSnapshot) => {
        onClose();
        onEdit(snapshot);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="All Snapshots" size="2xl">
            <div className="space-y-3" data-testid="snapshots-table-modal-body">
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                        {snapshots.length}{' '}
                        {snapshots.length === 1 ? 'snapshot' : 'snapshots'}
                    </span>
                    <button
                        type="button"
                        onClick={toggleSortDir}
                        className="text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
                    >
                        Date {sortDir === 'desc' ? '↓ newest first' : '↑ oldest first'}
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-700">
                    {snapshots.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500">
                            No snapshots yet.
                        </div>
                    ) : (
                        <table
                            className="w-full text-sm"
                            data-testid="snapshots-table"
                        >
                            <thead className="sticky top-0 bg-gray-800 text-xs uppercase tracking-wide text-gray-400">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium">
                                        Date
                                    </th>
                                    <th className="text-right px-3 py-2 font-medium">
                                        Total ({primaryCurrency})
                                    </th>
                                    {currencyColumns.map((cur) => (
                                        <th
                                            key={cur}
                                            className="text-right px-3 py-2 font-medium"
                                        >
                                            {cur}
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {sortedSnapshots.map((s) => (
                                    <tr
                                        key={s.id}
                                        className="border-t border-gray-700/40 hover:bg-gray-800/50"
                                        data-testid={`snapshots-table-row-${s.id}`}
                                    >
                                        <td className="px-3 py-2 text-gray-200 whitespace-nowrap">
                                            {formatRowDate(s.snapshotDate)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-100">
                                            <CurrencyAmount
                                                amount={s.totalNetWorth}
                                                currency={primaryCurrency}
                                                locale="en-US"
                                                minimumFractionDigits={0}
                                                maximumFractionDigits={0}
                                            />
                                        </td>
                                        {currencyColumns.map((cur) => {
                                            const amount = s.breakdown?.[cur];
                                            return (
                                                <td
                                                    key={cur}
                                                    className="px-3 py-2 text-right font-mono tabular-nums text-gray-300"
                                                >
                                                    {typeof amount === 'number' &&
                                                    Number.isFinite(amount) ? (
                                                        <CurrencyAmount
                                                            amount={amount}
                                                            currency={cur}
                                                            locale="en-US"
                                                            minimumFractionDigits={0}
                                                            maximumFractionDigits={0}
                                                        />
                                                    ) : (
                                                        <span className="text-gray-600">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleEditClick(s)}
                                                aria-label={`Edit snapshot for ${formatRowDate(s.snapshotDate)}`}
                                                title="Edit snapshot"
                                                className="p-1.5 rounded-md text-gray-400 hover:text-blue-400 hover:bg-gray-700/50"
                                            >
                                                <Pencil className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default SnapshotsTableModal;
