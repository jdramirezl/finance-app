import { useState, useRef, useEffect } from 'react';
import { Plus, AlertTriangle, Calendar } from 'lucide-react';
import { useRemindersQuery, useReminderMutations } from '../../hooks/queries';
import Modal from '../Modal';
import ReminderForm from './ReminderForm';
import Button from '../Button';
import Card from '../Card';
import MonthSection from './MonthSection';
import { useNavigate } from 'react-router-dom';
import { groupRemindersByMonth, countOverdueReminders, type ReminderWithProjection } from '../../utils/reminderProjections';

const RemindersWidget = () => {
    const navigate = useNavigate();
    const { data: reminders = [], isLoading } = useRemindersQuery();
    const { deleteMutation, createMutation, updateMutation } = useReminderMutations();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<any>(null);

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
        if (reminder.isProjected && reminder.originalReminderId) {
            // For projected reminders, find and edit the original
            const originalReminder = reminders.find(r => r.id === reminder.originalReminderId);
            if (originalReminder) {
                setEditingReminder(originalReminder);
            }
        } else {
            setEditingReminder(reminder);
        }
        setIsFormOpen(true);
    };

    const handleCreate = async (data: any) => {
        await createMutation.mutateAsync(data);
        setIsFormOpen(false);
    };

    const handleUpdate = async (data: any) => {
        if (editingReminder) {
            await updateMutation.mutateAsync({ id: editingReminder.id, data });
            setEditingReminder(null);
            setIsFormOpen(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this reminder?')) {
            await deleteMutation.mutateAsync(id);
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
                title={editingReminder ? 'Edit Reminder' : 'New Reminder'}
                size="lg"
            >
                <ReminderForm
                    initialData={editingReminder}
                    onSubmit={editingReminder ? handleUpdate : handleCreate}
                    onCancel={() => {
                        setIsFormOpen(false);
                        setEditingReminder(null);
                    }}
                    isSaving={createMutation.isPending || updateMutation.isPending}
                />
            </Modal>
        </div>
    );
};

export default RemindersWidget;

