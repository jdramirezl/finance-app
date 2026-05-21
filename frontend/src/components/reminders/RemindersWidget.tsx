import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, AlertTriangle, Calendar } from 'lucide-react';
import { useRemindersQuery, useReminderMutations, useSettingsQuery } from '../../hooks/queries';
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
    const { data: settings } = useSettingsQuery();
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

    const [showPaid, setShowPaid] = useState(false);
    const monthGroups = useMemo(
        () => groupRemindersByMonth(reminders, 1, 2, showPaid),
        [reminders, showPaid]
    );
    const overdueCount = useMemo(
        () => countOverdueReminders(reminders),
        [reminders]
    );

    useEffect(() => {
        if (scrollContainerRef.current && monthGroups.length > 0) {
            const currentMonthElement = scrollContainerRef.current.querySelector('[data-current-month="true"]');
            if (currentMonthElement) {
                currentMonthElement.scrollIntoView({ block: 'start', behavior: 'auto' });
            }
        }
    }, [monthGroups.length]);

    if (isLoading) {
        return <div className="animate-pulse h-48 bg-surface-container rounded-lg"></div>;
    }

    const hasAnyReminders = monthGroups.some(group => group.reminders.length > 0);

    return (
        <div className="h-full flex flex-col">
            <Card padding="none" className="flex-1 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Upcoming Payments
                    </h3>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowPaid(!showPaid)}
                            className={`text-xs px-2 py-1 rounded-md transition-colors ${
                                showPaid
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                            title={showPaid ? 'Hide paid reminders' : 'Show paid reminders'}
                        >
                            {showPaid ? 'Hide paid' : 'Show paid'}
                        </button>
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
                </div>

                {/* Overdue Alert Banner */}
                {overdueCount > 0 && (
                    <div className="px-4 py-3 bg-[#93000a]/20 border-b border-[#ffb4ab]/20 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[#ffb4ab]" aria-hidden="true" />
                        <span className="text-sm font-medium text-[#ffb4ab]">
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
                        <div className="flex flex-col items-center justify-center h-full py-8 text-on-surface-variant">
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
                                    advanceDays={settings?.reminderAdvanceDays}
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
