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
    advanceDays?: number;
}

const statusStyles: Record<ReminderStatus, {
    card: string;
    border: string;
    badge?: string;
    badgeText?: string;
    icon: React.ReactNode;
}> = {
    overdue: {
        card: 'bg-[#93000a]/10',
        border: 'border-l-[#ffb4ab]',
        badge: 'bg-[#93000a]/20 text-[#ffb4ab]',
        badgeText: 'OVERDUE',
        icon: <AlertTriangle className="w-4 h-4 text-[#ffb4ab]" aria-hidden="true" />,
    },
    today: {
        card: 'bg-[#e89337]/10',
        border: 'border-l-[#ffb873]',
        badge: 'bg-[#e89337]/20 text-[#ffb873]',
        badgeText: 'DUE TODAY',
        icon: <Calendar className="w-4 h-4 text-[#ffb873]" aria-hidden="true" />,
    },
    'this-week': {
        card: 'bg-[#e89337]/5',
        border: 'border-l-[#ffb873]',
        icon: <Calendar className="w-4 h-4 text-[#ffb873]" aria-hidden="true" />,
    },
    upcoming: {
        card: 'bg-primary/5',
        border: 'border-l-primary',
        icon: <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />,
    },
    paid: {
        card: 'bg-surface-container-high/50 opacity-60',
        border: 'border-l-outline',
        icon: <Check className="w-4 h-4 text-[#34d399]" aria-hidden="true" />,
    },
    projected: {
        card: 'bg-surface-container/30 border-dashed',
        border: 'border-l-outline border-dashed',
        icon: <Clock className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />,
    },
};

const ReminderCard = ({ reminder, onPayNow, onEdit, onDelete, onMarkAsPaid, advanceDays }: ReminderCardProps) => {
    const status = getReminderStatus(reminder, advanceDays);
    const styles = statusStyles[status];
    const isPaid = status === 'paid';
    const isProjected = status === 'projected';

    return (
        <div
            className={`
                relative rounded-lg border-l-4 border border-outline-variant
                ${styles.card} ${styles.border}
                ${isProjected ? 'border-dashed' : ''}
                transition-all duration-200 group
                hover:scale-[1.01]
            `}
            style={
                status === 'upcoming'
                    ? {
                        backgroundColor: `rgba(76, 215, 246, ${Math.max(0.03, 0.12 - Math.min(30, Math.max(0, (parseDate(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) / 250)})`,
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
                            <h4 className={`font-medium text-on-surface truncate ${isPaid ? 'line-through text-on-surface-variant' : ''}`}>
                                {reminder.title}
                            </h4>
                            {isProjected && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">
                                    projected
                                </span>
                            )}
                        </div>

                        {/* Date and status badge */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-sm font-mono ${isPaid ? 'text-outline' : 'text-on-surface-variant'}`}>
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
                        <span className={`block font-bold text-lg whitespace-nowrap font-mono ${isPaid ? 'line-through text-outline' : 'text-on-surface'}`}>
                            ${reminder.amount.toLocaleString()}
                        </span>
                        {!isPaid && !isProjected && status === 'upcoming' && (() => {
                            const daysUntil = Math.ceil((parseDate(reminder.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            if (daysUntil <= 3) {
                                return <span className="text-xs font-bold text-[#ffb873] block animate-pulse">URGENT</span>;
                            } else if (daysUntil <= 7) {
                                return <span className="text-xs font-medium text-primary block">This Week</span>;
                            }
                            return null;
                        })()}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-1 mt-2 opacity-70 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!isPaid && !isProjected && (
                        <>
                            <button
                                onClick={() => onPayNow(reminder)}
                                className="p-1.5 text-[#34d399] hover:bg-[#34d399]/10 rounded-lg transition-colors"
                                title="Pay Now (create movement)"
                                aria-label={`Pay ${reminder.title} now (create movement)`}
                            >
                                <DollarSign className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => onMarkAsPaid(reminder)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Mark as Paid (no new movement)"
                                aria-label={`Mark ${reminder.title} as paid without creating a movement`}
                            >
                                <Check className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => onEdit(reminder)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title={isProjected ? 'Create from Template' : 'Edit'}
                        aria-label={isProjected ? `Create reminder from ${reminder.title} template` : `Edit reminder ${reminder.title}`}
                    >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                    {!isProjected && (
                        <button
                            onClick={() => onDelete(reminder)}
                            className="p-1.5 text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-lg transition-colors"
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
