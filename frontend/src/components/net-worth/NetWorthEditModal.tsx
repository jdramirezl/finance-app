/**
 * Net Worth Edit Modal
 *
 * Self-contained modal for editing or deleting an existing net-worth
 * snapshot. Owns its own visibility, form, and mutation state, and
 * exposes an imperative `open(snapshot)` handle so parent components
 * can trigger it (e.g. from a chart click) without managing state.
 */

import { forwardRef, useImperativeHandle, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { useNetWorthSnapshotMutations } from '../../hooks/queries/useNetWorthSnapshotQueries';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import type { NetWorthSnapshot } from '../../services/netWorthSnapshotService';

export interface NetWorthEditModalHandle {
    /** Open the modal pre-populated with the given snapshot. */
    open: (snapshot: NetWorthSnapshot) => void;
}

const NetWorthEditModal = forwardRef<NetWorthEditModalHandle>((_, ref) => {
    const { updateMutation, deleteMutation } = useNetWorthSnapshotMutations();
    const { confirm } = useConfirmDialog();

    const [isOpen, setIsOpen] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] =
        useState<NetWorthSnapshot | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [breakdownValues, setBreakdownValues] = useState<Record<string, string>>({});

    useImperativeHandle(
        ref,
        () => ({
            open: (snapshot: NetWorthSnapshot) => {
                setSelectedSnapshot(snapshot);
                setEditValue(snapshot.totalNetWorth.toString());
                const bv: Record<string, string> = {};
                const entries = Object.entries(snapshot.breakdown || {});
                if (entries.length > 0) {
                    for (const [currency, amount] of entries) {
                        bv[currency] = String(amount);
                    }
                } else {
                    // Default currencies when breakdown is empty
                    bv['COP'] = '0';
                    bv['USD'] = '0';
                    bv['MXN'] = '0';
                }
                setBreakdownValues(bv);
                setIsOpen(true);
            },
        }),
        [],
    );

    const handleClose = () => {
        setIsOpen(false);
        setSelectedSnapshot(null);
        setEditValue('');
        setBreakdownValues({});
    };

    const handleSaveEdit = async () => {
        if (!selectedSnapshot) return;

        const newValue = parseFloat(editValue);
        if (isNaN(newValue) || newValue < 0) return;

        const breakdown: Record<string, number> = {};
        for (const [currency, val] of Object.entries(breakdownValues)) {
            const parsed = parseFloat(val);
            if (!isNaN(parsed) && parsed >= 0) breakdown[currency] = parsed;
        }

        await updateMutation.mutateAsync({
            id: selectedSnapshot.id,
            data: { totalNetWorth: newValue, breakdown },
        });

        handleClose();
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
        handleClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
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

                    {Object.keys(breakdownValues).length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-gray-700">
                            <p className="text-sm font-medium text-gray-300">Currency Breakdown</p>
                            {Object.entries(breakdownValues).map(([currency, val]) => (
                                <Input
                                    key={currency}
                                    label={currency}
                                    type="number"
                                    value={val}
                                    onChange={(e) => setBreakdownValues(prev => ({ ...prev, [currency]: e.target.value }))}
                                    step="0.01"
                                    min="0"
                                />
                            ))}
                        </div>
                    )}

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
                                onClick={handleClose}
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
    );
});

NetWorthEditModal.displayName = 'NetWorthEditModal';

export default NetWorthEditModal;
