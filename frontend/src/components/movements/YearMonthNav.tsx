export interface YearMonthNavProps {
  years: number[];
  selectedYear: number;
  selectedMonth: number; // 1-12
  monthsWithData?: number[]; // 1-12 months that have movements
  onSelect: (year: number, month: number) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const YearMonthNav = ({ years, selectedYear, selectedMonth, monthsWithData, onSelect }: YearMonthNavProps) => (
  <div className="bg-gray-800/50 rounded-lg p-3 mb-4 space-y-2">
    <span className="text-xs text-gray-500 mb-1">Period</span>
    <div className="flex gap-1 overflow-x-auto">
      {years.map((year) => (
        <button
          key={year}
          onClick={() => onSelect(year, selectedMonth)}
          className={`px-3 py-1 text-sm rounded whitespace-nowrap ${
            year === selectedYear
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {year}
        </button>
      ))}
    </div>
    <div className="flex gap-1 flex-wrap">
      {MONTHS.map((label, i) => {
        const month = i + 1;
        const disabled = monthsWithData && !monthsWithData.includes(month);
        return (
          <button
            key={label}
            onClick={() => !disabled && onSelect(selectedYear, month)}
            className={`px-3 py-1 text-sm rounded ${
              month === selectedMonth
                ? 'bg-blue-500 text-white'
                : disabled
                  ? 'bg-gray-700 text-gray-300 opacity-50 cursor-not-allowed pointer-events-none'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  </div>
);

export default YearMonthNav;
