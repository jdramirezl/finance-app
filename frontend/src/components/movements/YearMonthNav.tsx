export interface YearMonthNavProps {
  years: number[];
  selectedYear: number;
  selectedMonth: number; // 1-12
  onSelect: (year: number, month: number) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const YearMonthNav = ({ years, selectedYear, selectedMonth, onSelect }: YearMonthNavProps) => (
  <div className="space-y-2">
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
      {MONTHS.map((label, i) => (
        <button
          key={label}
          onClick={() => onSelect(selectedYear, i + 1)}
          className={`px-3 py-1 text-sm rounded ${
            i + 1 === selectedMonth
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

export default YearMonthNav;
