import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMonthlyTrendQuery } from '../../hooks/queries/useReportsQueries';
import { formatCurrencyAmount } from '../ui/CurrencyAmount';

interface MonthlyTrendProps {
  months: number;
}

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString('default', { month: 'short' });
}

const MonthlyTrend = ({ months }: MonthlyTrendProps) => {
  const { data: response, isLoading } = useMonthlyTrendQuery(months);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (!response?.data?.length) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">No data available</p>
        <p className="text-sm mt-1">No transactions found for the selected period.</p>
      </div>
    );
  }

  const currency = response.currency;
  const chartData = response.data.map((entry) => ({
    ...entry,
    label: formatMonth(entry.month),
  }));

  const tickFormatter = (value: number) =>
    formatCurrencyAmount(value, currency, { maximumFractionDigits: 0 });

  const tooltipFormatter = (value: number, name: string) => [
    formatCurrencyAmount(value, currency),
    name,
  ];

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 12 }} width={80} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="net"
            name="Net"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyTrend;
