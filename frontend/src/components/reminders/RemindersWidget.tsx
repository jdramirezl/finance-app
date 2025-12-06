import { useState, useRef, useEffect } from 'react';
import { Plus, AlertTriangle, Calendar } from 'lucide-react';
import { useRemindersQuery, useReminderMutations } from '../../hooks/queries';
import Modal from '../Modal';
import ReminderForm from './ReminderForm';
import Button from '../Button';
import Card from '../Card';
import MonthSection from './MonthSection';
import RecurrenceActionModal from './RecurrenceActionModal';
import { useNavigate } from 'react-router-dom';
import { groupRemindersByMonth, countOverdueReminders, type ReminderWithProjection } from '../../utils/reminderProjections';

const RemindersWidget = () => {
    const navigate = useNavigate();
    const { data: reminders = [], isLoading } = useRemindersQuery();
    const { deleteMutation, createMutation, updateMutation, createExceptionMutation, splitMutation } = useReminderMutations();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<any>(null);
    const [isEditingException, setIsEditingException] = useState(false);
    const [splitDate, setSplitDate] = useState<string | null>(null);

    const [recurrenceModal, setRecurrenceModal] = useState<{
        isOpen: boolean;
        type: 'edit' | 'delete';
        reminder: ReminderWithProjection | null;
    }>({ isOpen: false, type: 'edit', reminder: null });

    // Group reminders by month (1 month back, 2 months ahead)
    const monthGroups = groupRemindersByMonth(reminders, 1, 2);
    const overdueCount = countOverdueReminders(reminders);

    // Scroll to current month on initial load
    useEffect(() => {
        if (scrollContainerRef.current && monthGroups.length > 0) {
            const currentMonthElement = scrollContainerRef.current.querySelector('[data-current-month="true"]');
            if (currentMonthElement) {
                currentMonthElement.scrollIntoView({ block: 'start', behavior: 'auto' });
            }
        }
    }, [monthGroups.length]);

    const handlePayNow = (reminder: ReminderWithProjection) => {
        // Navigate to movements page with pre-filled data
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
    };

    const handleEdit = (reminder: ReminderWithProjection) => {
        if (reminder.recurrence.type !== 'once') {
            setRecurrenceModal({ isOpen: true, type: 'edit', reminder });
        } else {
            setEditingReminder(reminder);
            setIsEditingException(false);
            setIsFormOpen(true);
        }
    };

    const handleDelete = (reminder: ReminderWithProjection) => {
        if (reminder.recurrence.type !== 'once') {
            setRecurrenceModal({ isOpen: true, type: 'delete', reminder });
        } else {
            if (confirm('Are you sure you want to delete this reminder?')) {
                deleteMutation.mutate(reminder.id);
            }
        }
    };

    const handleRecurrenceAction = async (scope: 'this' | 'all' | 'future') => {
        const { type, reminder } = recurrenceModal;
        if (!reminder) return;

        setRecurrenceModal(prev => ({ ...prev, isOpen: false }));

        const originalId = reminder.originalReminderId || reminder.id;

        if (type === 'delete') {
            if (scope === 'this') {
                // Delete this occurrence only (Create Exception)
                await createExceptionMutation.mutateAsync({
                    id: originalId,
                    data: {
                        originalDate: reminder.dueDate,
                        action: 'deleted'
                    }
                });
            } else if (scope === 'future') {
                // Delete this and future events (Split Series)
                if (confirm('Are you sure you want to delete this and all following reminders?')) {
                    await splitMutation.mutateAsync({
                        id: originalId,
                        splitDate: reminder.dueDate
                    });
                }
            } else {
                // Delete entire series
                if (confirm('Are you sure you want to delete this recurring reminder series?')) {
                    await deleteMutation.mutateAsync(originalId);
                }
            }
        } else if (type === 'edit') {
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

    const handleCreate = async (data: any) => {
        await createMutation.mutateAsync(data);
        setIsFormOpen(false);
    };

    const handleUpdate = async (data: any) => {
        if (editingReminder) {
            const originalId = editingReminder.originalReminderId || editingReminder.id;

            if (isEditingException) {
                // Determine original date (the one we clicked on, NOT the new date in form)
                // editingReminder.dueDate holds the initial date of the occurrence we clicked.

                await createExceptionMutation.mutateAsync({
                    id: originalId,
                    data: {
                        originalDate: editingReminder.dueDate,
                        action: 'modified',
                        newTitle: data.title,
                        newAmount: data.amount,
                        newDate: data.dueDate,
                        // Note: If isPaid status was changed in form, handle it? 
                        // ReminderForm doesn't typically toggle isPaid.
                    }
                });
            } else if (splitDate) {
                // Split series (Edit This and Future)
                await splitMutation.mutateAsync({
                    id: originalId,
                    splitDate: splitDate,
                    newDetails: data
                });
            } else {
                await updateMutation.mutateAsync({ id: editingReminder.id, data });
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
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Upcoming Payments</h2>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                        setEditingReminder(null);
                        setIsEditingException(false);
                        setIsFormOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <Card padding="none" className="flex-1 overflow-hidden flex flex-col">
                {/* Overdue Alert Banner */}
                {overdueCount > 0 && (
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
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
                    initialData={editingReminder}
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
        </div>
    );
};

export default RemindersWidget;

