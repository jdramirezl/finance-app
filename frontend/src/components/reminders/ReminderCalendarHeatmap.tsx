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
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    // Build occurrence map: yyyy-MM-dd -> { count, items }
    const occurrenceMap = useMemo(() => {
        const map = new Map<string, { count: number; items: { title: string; amount: number }[] }>();

        const addDate = (dateStr: string, title: string, amount: number) => {
            const key = dateStr.slice(0, 10);
            const existing = map.get(key);
            if (existing) {
                existing.count++;
                existing.items.push({ title, amount });
            } else {
                map.set(key, { count: 1, items: [{ title, amount }] });
            }
        };

        reminders.forEach(reminder => {
            addDate(reminder.dueDate, reminder.title, reminder.amount);
            const projections = generateProjectedOccurrences(reminder, 3);
            projections.forEach(p => addDate(p.dueDate, p.title, p.amount));
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

                    const dotSize = count <= 1 ? 'w-1.5 h-1.5' : count === 2 ? 'w-[7px] h-[7px]' : 'w-2 h-2';
                    const dotOpacity = count <= 1 ? 'bg-primary/50' : count === 2 ? 'bg-primary/70' : 'bg-primary';

                    return (
                        <div
                            key={key}
                            className={`relative flex flex-col items-center justify-center h-9 rounded-md text-xs transition-colors cursor-default ${
                                !inMonth ? 'opacity-30' : isPast ? 'opacity-50' : ''
                            } ${isToday(day) ? 'ring-1 ring-primary' : ''}`}
                            onMouseEnter={() => count > 0 && setHoveredDate(key)}
                            onMouseLeave={() => setHoveredDate(null)}
                            onClick={() => count > 0 && setHoveredDate(h => h === key ? null : key)}
                        >
                            <span className="text-on-surface">{format(day, 'd')}</span>
                            {count > 0 && (
                                <span className={`absolute bottom-1 rounded-full ${dotSize} ${dotOpacity}`} />
                            )}
                            {hoveredDate === key && occurrence && (
                                <div className="absolute z-50 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-surface-container-high border border-outline-variant rounded-md px-2 py-1.5 shadow-lg whitespace-nowrap">
                                    {occurrence.items.map((item, i) => (
                                        <div key={i} className="text-xs text-on-surface">
                                            {item.title} - ${item.amount.toLocaleString()}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReminderCalendarHeatmap;
