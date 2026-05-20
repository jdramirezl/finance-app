import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, AlertTriangle, Calendar } from 'lucide-react';
import { useRemindersQuery, useReminderMutations } from '../../hooks/queries';
import Modal from '../Modal';
import ReminderForm from './ReminderForm';
import Button from '../Button';
import Card from '../Card';
import ConfirmDialog from '../ConfirmDialog';
import MonthSection from './MonthSection';
import RecurrenceActionModal from './RecurrenceActionModal';
import MarkAsPaidModal from './MarkAsPaidModal';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../hooks/useConfirm';
import { groupRemindersByMonth, countOverdueReminders, type ReminderWithProjection } from '../../utils/reminderProjections';
import { toDateOnly } from '../../utils/dateUtils';
import type { CreateReminderDTO, UpdateReminderDTO } from '../../services/reminderService';

const RemindersWidget = () => {
    const navigate = useNavigate();
    const { data: reminders = [], isLoading } = useRemindersQuery();
    const { deleteMutation, createMutation, updateMutation, createExceptionMutation, splitMutation } = useReminderMutations();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<ReminderWithProjection | null>(null);
    const [isEditingException, setIsEditingException] = useState(false);
    const [splitDate, setSplitDate] = useState<string | null>(null);

    const [recurrenceModal, setRecurrenceModal] = useState<{
        isOpen: boolean;
        type: 'edit' | 'delete';
        reminder: ReminderWithProjection | null;
    }>({ isOpen: false, type: 'edit', reminder: null });

    const [markAsPaidReminder, setMarkAsPaidReminder] = useState<ReminderWithProjection | null>(null);

    // Group reminders by month (1 month back, 2 months ahead). Memoized so we
    // don't re-bucket the entire list on every keystroke in unrelated state.
    const monthGroups = useMemo(
        () => groupRemindersByMonth(reminders, 1, 2),
        [reminders]
    );
    const overdueCount = useMemo(
        () => countOverdueReminders(reminders),
        [reminders]
    );

    // Scroll to current month on initial load
    useEffect(() => {
        if (scrollContainerRef.current && monthGroups.length > 0) {
            const currentMonthElement = scrollContainerRef.current.querySelector('[data-current-month="true"]');
            if (currentMonthElement) {
                currentMonthElement.scrollIntoView({ block: 'start', behavior: 'auto' });
            }
        }
    }, [monthGroups.length]);

    // Stable handlers passed to memoized MonthSection -> ReminderCard. Without
    // useCallback these would be re-created on every keystroke in the modal.
    const handlePayNow = useCallback(
        (reminder: ReminderWithProjection) => {
            const params = new URLSearchParams();
            params.set('action', 'new');
            params.set('amount', reminder.amount.toString());
            params.set('notes', reminder.title);
            params.set('date', reminder.dueDate);

            if (reminder.templateId) params.set('templateId', reminder.templateId);
            if (reminder.fixedExpenseId) params.set('fixedExpenseId', reminder.fixedExpenseId);

            // Use original reminder ID for projected reminders
            const reminderId = reminder.originalReminderId || reminder.id;
            params.set('reminderId', reminderId);

            navigate(`/movements?${params.toString()}`);
        },
        [navigate]
    );

    const handleEdit = useCallback(
        (reminder: ReminderWithProjection) => {
            if (reminder.recurrence.type !== 'once') {
                setRecurrenceModal({ isOpen: true, type: 'edit', reminder });
            } else {
                setEditingReminder(reminder);
                setIsEditingException(false);
                setIsFormOpen(true);
            }
        },
        []
    );

    const handleDelete = useCallback(
        async (reminder: ReminderWithProjection) => {
            if (reminder.recurrence.type !== 'once') {
                setRecurrenceModal({ isOpen: true, type: 'delete', reminder });
                return;
            }

            const ok = await confirm({
                title: 'Delete Reminder',
                message: 'Are you sure you want to delete this reminder?',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                variant: 'danger',
            });
            if (!ok) return;

            deleteMutation.mutate(reminder.id);
        },
        [confirm, deleteMutation]
    );

    const handleMarkAsPaid = useCallback((reminder: ReminderWithProjection) => {
        setMarkAsPaidReminder(reminder);
    }, []);

    const handleConfirmMarkAsPaid = async (movementId?: string) => {
        if (!markAsPaidReminder) return;

        const originalId = markAsPaidReminder.originalReminderId || markAsPaidReminder.id;

        try {
            if (markAsPaidReminder.recurrence.type === 'once') {
                await updateMutation.mutateAsync({
                    id: originalId,
                    data: {
                        isPaid: true,
                        linkedMovementId: movementId
                    }
                });
            } else {
                // Create exception
                await createExceptionMutation.mutateAsync({
                    id: originalId,
                    data: {
                        originalDate: toDateOnly(markAsPaidReminder.dueDate),
                        action: 'modified',
                        isPaid: true,
                        linkedMovementId: movementId
                    }
                });
            }
        } catch {
            // Toast is shown by the mutation's onError handler.
        } finally {
            setMarkAsPaidReminder(null);
        }
    };

    const handleRecurrenceAction = async (scope: 'this' | 'all' | 'future') => {
        const { type, reminder } = recurrenceModal;
        if (!reminder) return;

        const originalId = reminder.originalReminderId || reminder.id;
        const closeRecurrenceModal = () => setRecurrenceModal(prev => ({ ...prev, isOpen: false }));

        if (type === 'delete') {
            try {
                if (scope === 'this') {
                    // Delete this occurrence only (Create Exception)
                    await createExceptionMutation.mutateAsync({
                        id: originalId,
                        data: {
                            originalDate: toDateOnly(reminder.dueDate),
                            action: 'deleted'
                        }
                    });
                } else if (scope === 'future') {
                    // Delete this and future events (Split Series)
                    const ok = await confirm({
                        title: 'Delete Future Reminders',
                        message: 'Are you sure you want to delete this and all following reminders?',
                        confirmText: 'Delete',
                        cancelText: 'Cancel',
                        variant: 'danger',
                    });
                    if (!ok) {
                        closeRecurrenceModal();
                        return;
                    }
                    await splitMutation.mutateAsync({
                        id: originalId,
                        splitDate: reminder.dueDate
                    });
                } else {
                    // Delete entire series
                    const ok = await confirm({
                        title: 'Delete Recurring Series',
                        message: 'Are you sure you want to delete this recurring reminder series?',
                        confirmText: 'Delete Series',
                        cancelText: 'Cancel',
                        variant: 'danger',
                    });
                    if (!ok) {
                        closeRecurrenceModal();
                        return;
                    }
                    await deleteMutation.mutateAsync(originalId);
                }
                // Only close on success — on error the underlying mutation's onError
                // shows a toast (see useReminderQueries) and the modal remains open
                // so the user can retry.
                closeRecurrenceModal();
            } catch {
                // Mutation hooks display the toast via onError. Keep the recurrence
                // modal open so the user can retry the action.
            }
        } else if (type === 'edit') {
            // Edit branches are synchronous: they hand off to the form modal.
            closeRecurrenceModal();
            if (scope === 'this') {
                // Edit this occurrence only
                setEditingReminder(reminder);
                setIsEditingException(true);
                setSplitDate(null);
                setIsFormOpen(true);
            } else if (scope === 'future') {
                // Edit this and future events
                setEditingReminder(reminder);
                setIsEditingException(false);
                setSplitDate(reminder.dueDate);
                setIsFormOpen(true);
            } else {
                // Edit entire series
                const original = reminders.find(r => r.id === originalId);
                if (original) {
                    setEditingReminder(original);
                    setIsEditingException(false);
                    setSplitDate(null);
                    setIsFormOpen(true);
                }
            }
        }
    };

    const handleCreate = async (data: CreateReminderDTO | UpdateReminderDTO) => {
        await createMutation.mutateAsync(data as CreateReminderDTO);
        setIsFormOpen(false);
    };

    const handleUpdate = async (data: CreateReminderDTO | UpdateReminderDTO) => {
        if (editingReminder) {
            const originalId = editingReminder.originalReminderId ?? editingReminder.id;

            if (isEditingException) {
                // Determine original date (the one we clicked on, NOT the new date in form)
                // editingReminder.dueDate holds the initial date of the occurrence we clicked.
                await createExceptionMutation.mutateAsync({
                    id: originalId,
                    data: {
                        originalDate: toDateOnly(editingReminder.dueDate),
                        action: 'modified',
                        newTitle: data.title,
                        newAmount: data.amount,
                        newDate: data.dueDate,
                    }
                });
            } else if (splitDate) {
                // Split series (Edit This and Future)
                await splitMutation.mutateAsync({
                    id: originalId,
                    splitDate,
                    newDetails: data as CreateReminderDTO,
                });
            } else {
                await updateMutation.mutateAsync({ id: editingReminder.id, data: data as UpdateReminderDTO });
            }
            setEditingReminder(null);
            setSplitDate(null);
            setIsFormOpen(false);
        }
    };

    if (isLoading) {
        return <div className="animate-pulse h-48 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>;
    }

    const hasAnyReminders = monthGroups.some(group => group.reminders.length > 0);

    return (
        <div className="h-full flex flex-col">
            <Card padding="none" className="flex-1 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Upcoming Payments
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setEditingReminder(null);
                            setIsEditingException(false);
                            setIsFormOpen(true);
                        }}
                        className="!p-1.5"
                        aria-label="Add new reminder"
                        title="Add new reminder"
                    >
                        <Plus className="w-5 h-5" aria-hidden="true" />
                    </Button>
                </div>

                {/* Overdue Alert Banner */}
                {overdueCount > 0 && (
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                            You have {overdueCount} overdue payment{overdueCount > 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                {/* Monthly Timeline */}
                <div
                    ref={scrollContainerRef}
                    className="overflow-y-auto flex-1 p-3"
                >
                    {!hasAnyReminders ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-gray-500 dark:text-gray-400">
                            <Calendar className="w-10 h-10 mb-3 opacity-50" />
                            <p className="text-center">No reminders yet</p>
                            <p className="text-sm text-center mt-1 opacity-75">
                                Click + to add your first payment reminder
                            </p>
                        </div>
                    ) : (
                        monthGroups.map(monthGroup => (
                            <div
                                key={monthGroup.key}
                                data-current-month={monthGroup.isCurrentMonth}
                            >
                                <MonthSection
                                    monthGroup={monthGroup}
                                    onPayNow={handlePayNow}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onMarkAsPaid={handleMarkAsPaid}
                                />
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingReminder(null);
                }}
                title={editingReminder ? (isEditingException ? 'Edit This Occurrence' : 'Edit Reminder') : 'New Reminder'}
                size="lg"
            >
                <ReminderForm
                    initialData={editingReminder ?? undefined}
                    onSubmit={editingReminder ? handleUpdate : handleCreate}
                    onCancel={() => {
                        setIsFormOpen(false);
                        setEditingReminder(null);
                    }}
                    isSaving={createMutation.isPending || updateMutation.isPending || createExceptionMutation.isPending}
                />
            </Modal>

            {/* Recurrence Action Modal */}
            <RecurrenceActionModal
                isOpen={recurrenceModal.isOpen}
                onClose={() => setRecurrenceModal(prev => ({ ...prev, isOpen: false }))}
                onAction={handleRecurrenceAction}
                actionType={recurrenceModal.type}
            />

            {/* Mark as Paid Modal */}
            <MarkAsPaidModal
                isOpen={!!markAsPaidReminder}
                onClose={() => setMarkAsPaidReminder(null)}
                onConfirm={handleConfirmMarkAsPaid}
                reminder={markAsPaidReminder}
            />

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                variant={confirmState.variant}
                onConfirm={handleConfirm}
                onClose={handleClose}
            />
        </div>
    );
};

export default RemindersWidget;
