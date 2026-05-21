import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  format,
} from 'date-fns';

export interface DateRange {
  startDate: string;
  endDate: string;
}

type PresetKey = 'this-month' | 'last-month' | 'last-3' | 'last-6' | 'this-year' | 'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'last-3', label: 'Last 3 Months' },
  { key: 'last-6', label: 'Last 6 Months' },
  { key: 'this-year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

function computeRange(key: PresetKey): DateRange {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

  switch (key) {
    case 'this-month':
      return { startDate: fmt(startOfMonth(now)), endDate: fmt(endOfMonth(now)) };
    case 'last-month': {
      const prev = subMonths(now, 1);
      return { startDate: fmt(startOfMonth(prev)), endDate: fmt(endOfMonth(prev)) };
    }
    case 'last-3':
      return { startDate: fmt(startOfMonth(subMonths(now, 2))), endDate: fmt(endOfMonth(now)) };
    case 'last-6':
      return { startDate: fmt(startOfMonth(subMonths(now, 5))), endDate: fmt(endOfMonth(now)) };
    case 'this-year':
      return { startDate: fmt(startOfYear(now)), endDate: fmt(endOfMonth(now)) };
    case 'custom':
      return { startDate: fmt(startOfMonth(now)), endDate: fmt(endOfMonth(now)) };
  }
}

interface PeriodSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
  const [activePreset, setActivePreset] = useState<PresetKey>('this-month');
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);

  const handlePreset = (key: PresetKey) => {
    setActivePreset(key);
    if (key !== 'custom') {
      onChange(computeRange(key));
    }
  };

  const handleCustomChange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (start && end) {
      onChange({ startDate: start, endDate: end });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handlePreset(key)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activePreset === key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {label}
        </button>
      ))}
      {activePreset === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => handleCustomChange(e.target.value, customEnd)}
            className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => handleCustomChange(customStart, e.target.value)}
            className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      )}
    </div>
  );
};

export { computeRange };
export default PeriodSelector;
