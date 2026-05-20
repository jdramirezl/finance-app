import { memo } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, DollarSign, Edit2, Trash2, Check, Clock, AlertTriangle } from 'lucide-react';
import type { ReminderWithProjection, ReminderStatus } from '../../utils/reminderProjections';
import { getReminderStatus } from '../../utils/reminderProjections';
import { parseDate } from '../../utils/dateUtils';

interface ReminderCardProps {
    reminder: ReminderWithProjection;
    onPayNow: (reminder: ReminderWithProjection) => void;
    onEdit: (reminder: ReminderWithProjection) => void;
    onDelete: (reminder: ReminderWithProjection) => void;
    onMarkAsPaid: (reminder: ReminderWithProjection) => void;
}

const statusStyles: Record<ReminderStatus, {
    card: string;
    border: string;
    badge?: string;
    badgeText?: string;
    icon: React.ReactNode;
}> = {
    overdue: {
        card: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-l-red-500',
        badge: 'bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300',
        badgeText: 'OVERDUE',
        icon: <AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" />,
    },
    today: {
        card: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-l-orange-500',
        badge: 'bg-orange-100 dark:bg-orange-800/50 text-orange-700 dark:text-orange-300',
        badgeText: 'DUE TODAY',
        icon: <Calendar className="w-4 h-4 text-orange-500" aria-hidden="true" />,
    },
    'this-week': {
        card: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-l-yellow-500',
        icon: <Calendar className="w-4 h-4 text-yellow-600" aria-hidden="true" />,
    },
    upcoming: {
        card: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-l-blue-500',
        icon: <Calendar className="w-4 h-4 text-blue-500" aria-hidden="true" />,
    },
    paid: {
        card: 'bg-gray-50 dark:bg-gray-800/50 opacity-60',
        border: 'border-l-gray-400',
        icon: <Check className="w-4 h-4 text-green-500" aria-hidden="true" />,
    },
    projected: {
        card: 'bg-gray-50/50 dark:bg-gray-800/30 border-dashed',
        border: 'border-l-gray-400 border-dashed',
        icon: <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />,
    },
};

/**
 * Renders a single reminder card. Wrapped in React.memo so updating one
 * reminder (e.g. marking it paid) does not re-render every other card in
 * the month section. Parents must pass stable callbacks via useCallback
 * for the memo to be effective.
 */
const ReminderCard = ({ reminder, onPayNow, onEdit, onDelete, onMarkAsPaid }: ReminderCardProps) => {
    const status = getReminderStatus(reminder);
    const styles = statusStyles[status];
    const isPaid = status === 'paid';
    const isProjected = status === 'projected';

    return (
        <div
            className={`
                relative rounded-lg border-l-4 border border-gray-200 dark:border-gray-700
                ${styles.card} ${styles.border}
                ${isProjected ? 'border-dashed' : ''}
                transition-all duration-200 group
                hover:shadow-md hover:scale-[1.01]
            `}
            style={
                status === 'upcoming'
                    ? {
                        backgroundColor: `rgba(59, 130, 246, ${Math.max(0.05, 0.2 - Math.min(30, Math.max(0, (parseDate(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) / 150)})`,
                    }
                    : {}
            }
        >
            <div className="p-3">
                {/* Header with title and amount */}
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {styles.icon}
                            <h4 className={`font-medium text-gray-900 dark:text-gray-100 truncate ${isPaid ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                                {reminder.title}
                            </h4>
                            {isProjected && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                    projected
                                </span>
                            )}
                        </div>

                        {/* Date and status badge */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-sm ${isPaid ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                {format(parseISO(reminder.dueDate), 'MMM d')}
                            </span>
                            {styles.badge && styles.badgeText && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
                                    {styles.badgeText}
                                </span>
                            )}
                        </div>
                    </div>


                    {/* Amount */}
                    <div className="text-right">
                        <span className={`block font-bold text-lg whitespace-nowrap ${isPaid ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                            ${reminder.amount.toLocaleString()}
                        </span>
                        {!isPaid && !isProjected && status === 'upcoming' && (() => {
                            const daysUntil = Math.ceil((parseDate(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            if (daysUntil <= 3) {
                                return <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block animate-pulse">URGENT</span>;
                            } else if (daysUntil <= 7) {
                                return <span className="text-xs font-medium text-blue-500 dark:text-blue-300 block">This Week</span>;
                            }
                            return null;
                        })()}
                    </div>
                </div>

                {/* Action buttons stay visible at lower opacity by default so
                    keyboard and touch users can always reach them. */}
                <div className="flex justify-end gap-1 mt-2 opacity-70 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!isPaid && !isProjected && (
                        <>
                            <button
                                onClick={() => onPayNow(reminder)}
                                className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title="Pay Now (create movement)"
                                aria-label={`Pay ${reminder.title} now (create movement)`}
                            >
                                <DollarSign className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => onMarkAsPaid(reminder)}
                                className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Mark as Paid (no new movement)"
                                aria-label={`Mark ${reminder.title} as paid without creating a movement`}
                            >
                                <Check className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => onEdit(reminder)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title={isProjected ? 'Create from Template' : 'Edit'}
                        aria-label={isProjected ? `Create reminder from ${reminder.title} template` : `Edit reminder ${reminder.title}`}
                    >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                    {!isProjected && (
                        <button
                            onClick={() => onDelete(reminder)}
                            className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                            aria-label={`Delete reminder ${reminder.title}`}
                        >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(ReminderCard);
