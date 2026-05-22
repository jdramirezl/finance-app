import { memo } from 'react';
import type { MonthGroup, ReminderWithProjection } from '../../utils/reminderProjections';
import ReminderCard from './ReminderCard';

interface MonthSectionProps {
    monthGroup: MonthGroup;
    onPayNow: (reminder: ReminderWithProjection) => void;
    onEdit: (reminder: ReminderWithProjection) => void;
    onDelete: (reminder: ReminderWithProjection) => void;
    onMarkAsPaid: (reminder: ReminderWithProjection) => void;
    advanceDays?: number;
}

const MonthSection = ({ monthGroup, onPayNow, onEdit, onDelete, onMarkAsPaid, advanceDays }: MonthSectionProps) => {
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
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : isPastMonth
                        ? 'bg-gray-700/60'
                        : 'bg-gray-800/40'
                }
            `}>
                <h3 className={`
                    text-sm font-semibold uppercase tracking-wide
                    ${isCurrentMonth
                        ? 'text-blue-400'
                        : isPastMonth
                            ? 'text-gray-400'
                            : 'text-gray-400'
                    }
                `}>
                    {label}
                    {isCurrentMonth && (
                        <span className="ml-2 text-xs font-normal normal-case text-blue-400/70">
                            (Current)
                        </span>
                    )}
                </h3>
            </div>

            {/* Reminder Cards */}
            <div className="space-y-2 px-1">
                {reminders.map(reminder => (
                    <ReminderCard
                        key={`${reminder.id}-${reminder.dueDate}`}
                        reminder={reminder}
                        onPayNow={onPayNow}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onMarkAsPaid={onMarkAsPaid}
                        advanceDays={advanceDays}
                    />
                ))}
            </div>
        </div>
    );
};

export default memo(MonthSection);
