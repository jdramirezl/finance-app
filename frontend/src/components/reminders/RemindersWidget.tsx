import { useEffect, useMemo, useRef } from 'react';
import { Plus, AlertTriangle, Calendar } from 'lucide-react';
import { useRemindersQuery, useReminderMutations } from '../../hooks/queries';
import { useReminderActions } from '../../hooks/actions/useReminderActions';
import Modal from '../ui/Modal';
import ReminderForm from './ReminderForm';
import Button from '../ui/Button';
import Card from '../ui/Card';
import MonthSection from './MonthSection';
import RecurrenceActionModal from './RecurrenceActionModal';
import MarkAsPaidModal from './MarkAsPaidModal';
import { groupRemindersByMonth, countOverdueReminders } from '../../utils/reminderProjections';

const RemindersWidget = () => {
    const { data: reminders = [], isLoading } = useRemindersQuery();
    const mutations = useReminderMutations();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const {
        isFormOpen,
        editingReminder,
        isEditingException,
        openCreateForm,
        closeForm,
        recurrenceModal,
        closeRecurrenceModal,
        markAsPaidReminder,
        closeMarkAsPaid,
        handlePayNow,
        handleEdit,
        handleDelete,
        handleMarkAsPaid,
        handleConfirmMarkAsPaid,
        handleRecurrenceAction,
        handleCreate,
        handleUpdate,
        isSaving,
    } = useReminderActions({ reminders, mutations });

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
                        onClick={openCreateForm}
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
                onClose={closeForm}
                title={editingReminder ? (isEditingException ? 'Edit This Occurrence' : 'Edit Reminder') : 'New Reminder'}
                size="lg"
            >
                <ReminderForm
                    initialData={editingReminder ?? undefined}
                    onSubmit={editingReminder ? handleUpdate : handleCreate}
                    onCancel={closeForm}
                    isSaving={isSaving}
                />
            </Modal>

            {/* Recurrence Action Modal */}
            <RecurrenceActionModal
                isOpen={recurrenceModal.isOpen}
                onClose={closeRecurrenceModal}
                onAction={handleRecurrenceAction}
                actionType={recurrenceModal.type}
            />

            {/* Mark as Paid Modal */}
            <MarkAsPaidModal
                isOpen={!!markAsPaidReminder}
                onClose={closeMarkAsPaid}
                onConfirm={handleConfirmMarkAsPaid}
                reminder={markAsPaidReminder}
            />
        </div>
    );
};

export default RemindersWidget;
