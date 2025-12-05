import type { MonthGroup, ReminderWithProjection } from '../../utils/reminderProjections';
import ReminderCard from './ReminderCard';

interface MonthSectionProps {
    monthGroup: MonthGroup;
    onPayNow: (reminder: ReminderWithProjection) => void;
    onEdit: (reminder: ReminderWithProjection) => void;
    onDelete: (id: string) => void;
}

const MonthSection = ({ monthGroup, onPayNow, onEdit, onDelete }: MonthSectionProps) => {
    const { label, reminders, isCurrentMonth, isPastMonth } = monthGroup;

    if (reminders.length === 0) {
        return null;
    }

    return (
        <div className="mb-4">
            {/* Month Header */}
            <div className={`
                sticky top-0 z-10 py-2 px-3 mb-2 rounded-lg
                ${isCurrentMonth
                    ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800'
                    : isPastMonth
                        ? 'bg-gray-100 dark:bg-gray-800/60'
                        : 'bg-gray-50 dark:bg-gray-800/40'
                }
            `}>
                <h3 className={`
                    text-sm font-semibold uppercase tracking-wide
                    ${isCurrentMonth
                        ? 'text-blue-700 dark:text-blue-300'
                        : isPastMonth
                            ? 'text-gray-500 dark:text-gray-400'
                            : 'text-gray-600 dark:text-gray-400'
                    }
                `}>
                    {label}
                    {isCurrentMonth && (
                        <span className="ml-2 text-xs font-normal normal-case text-blue-600 dark:text-blue-400">
                            (Current)
                        </span>
                    )}
                </h3>
            </div>

            {/* Reminder Cards */}
            <div className="space-y-2 px-1">
                {reminders.map(reminder => (
                    <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        onPayNow={onPayNow}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
};

export default MonthSection;
