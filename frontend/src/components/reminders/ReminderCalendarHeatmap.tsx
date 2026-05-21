import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, addMonths, format, isSameDay, isBefore, isToday,
    parseISO
} from 'date-fns';
import type { Reminder } from '../../services/reminderService';
import { generateProjectedOccurrences } from '../../utils/reminderProjections';

interface Props {
    reminders: Reminder[];
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ReminderCalendarHeatmap = ({ reminders }: Props) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Build occurrence map: yyyy-MM-dd -> { count, titles }
    const occurrenceMap = useMemo(() => {
        const map = new Map<string, { count: number; titles: string[] }>();

        const addDate = (dateStr: string, title: string) => {
            const key = dateStr.slice(0, 10); // yyyy-MM-dd
            const existing = map.get(key);
            if (existing) {
                existing.count++;
                existing.titles.push(title);
            } else {
                map.set(key, { count: 1, titles: [title] });
            }
        };

        reminders.forEach(reminder => {
            // Add base due date
            addDate(reminder.dueDate, reminder.title);
            // Add projected occurrences
            const projections = generateProjectedOccurrences(reminder, 3);
            projections.forEach(p => addDate(p.dueDate, p.title));
        });

        return map;
    }, [reminders]);

    // Generate calendar days for the current month view
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days: Date[] = [];
        let day = calStart;
        while (!isBefore(calEnd, day)) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    const today = new Date();

    return (
        <div className="p-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={() => setCurrentMonth(m => addMonths(m, -1))}
                    className="p-1 rounded hover:bg-white/[0.06] text-on-surface-variant"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-on-surface">
                    {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                    onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                    className="p-1 rounded hover:bg-white/[0.06] text-on-surface-variant"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-xs text-on-surface-variant py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map(day => {
                    const key = format(day, 'yyyy-MM-dd');
                    const inMonth = day.getMonth() === currentMonth.getMonth();
                    const isPast = isBefore(day, today) && !isToday(day);
                    const occurrence = occurrenceMap.get(key);
                    const count = occurrence?.count ?? 0;

                    const dotClass = count === 0
                        ? ''
                        : count === 1
                            ? 'bg-primary/60'
                            : count === 2
                                ? 'bg-primary/80'
                                : 'bg-primary';

                    return (
                        <div
                            key={key}
                            className={`relative flex flex-col items-center justify-center h-9 rounded-md text-xs transition-colors ${
                                !inMonth ? 'opacity-30' : isPast ? 'opacity-50' : ''
                            } ${isToday(day) ? 'ring-1 ring-primary' : ''}`}
                            title={occurrence ? occurrence.titles.join(', ') : undefined}
                        >
                            <span className="text-on-surface">{format(day, 'd')}</span>
                            {count > 0 && (
                                <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotClass}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReminderCalendarHeatmap;
