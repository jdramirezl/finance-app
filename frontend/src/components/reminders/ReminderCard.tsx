import { format, parseISO } from 'date-fns';
import { Calendar, DollarSign, Edit2, Trash2, Check, Clock, AlertTriangle } from 'lucide-react';
import type { ReminderWithProjection, ReminderStatus } from '../../utils/reminderProjections';
import { getReminderStatus } from '../../utils/reminderProjections';

interface ReminderCardProps {
    reminder: ReminderWithProjection;
    onPayNow: (reminder: ReminderWithProjection) => void;
    onEdit: (reminder: ReminderWithProjection) => void;
    onDelete: (reminder: ReminderWithProjection) => void;
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
        icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    },
    today: {
        card: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-l-orange-500',
        badge: 'bg-orange-100 dark:bg-orange-800/50 text-orange-700 dark:text-orange-300',
        badgeText: 'DUE TODAY',
        icon: <Calendar className="w-4 h-4 text-orange-500" />,
    },
    'this-week': {
        card: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-l-yellow-500',
        icon: <Calendar className="w-4 h-4 text-yellow-600" />,
    },
    upcoming: {
        card: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-l-blue-500',
        icon: <Calendar className="w-4 h-4 text-blue-500" />,
    },
    paid: {
        card: 'bg-gray-50 dark:bg-gray-800/50 opacity-60',
        border: 'border-l-gray-400',
        icon: <Check className="w-4 h-4 text-green-500" />,
    },
    projected: {
        card: 'bg-gray-50/50 dark:bg-gray-800/30 border-dashed',
        border: 'border-l-gray-400 border-dashed',
        icon: <Clock className="w-4 h-4 text-gray-400" />,
    },
};

const ReminderCard = ({ reminder, onPayNow, onEdit, onDelete }: ReminderCardProps) => {
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
                    <span className={`font-bold text-lg whitespace-nowrap ${isPaid ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        ${reminder.amount.toLocaleString()}
                    </span>
                </div>

                {/* Action buttons - visible on hover */}
                <div className="flex justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isPaid && !isProjected && (
                        <button
                            onClick={() => onPayNow(reminder)}
                            className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Pay Now"
                        >
                            <DollarSign className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(reminder)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title={isProjected ? 'Create from Template' : 'Edit'}
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {!isProjected && (
                        <button
                            onClick={() => onDelete(reminder)}
                            className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReminderCard;
