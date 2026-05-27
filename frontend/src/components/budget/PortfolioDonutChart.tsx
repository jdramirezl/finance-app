import { PieChart, Pie, Cell } from 'recharts';
import type { DistributionEntry } from './BudgetEntryRow';

interface PortfolioDonutChartProps {
  entries: DistributionEntry[];
  distributable: number;
  currency: string;
  colors: string[];
  fixedExpensesTotal?: number;
  income?: number;
}

const fmt = (value: number, currency: string) =>
  value.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });

const FIXED_COLOR = '#ef4444'; // red for fixed expenses

const PortfolioDonutChart = ({ entries, distributable, currency, colors, fixedExpensesTotal = 0, income = 0 }: PortfolioDonutChartProps) => {
  const totalBudget = income || (distributable + fixedExpensesTotal);

  // Build slices as absolute amounts for proportional sizing
  const data: { name: string; value: number; color: string }[] = [];

  if (fixedExpensesTotal > 0) {
    data.push({ name: 'Fixed Expenses', value: fixedExpensesTotal, color: FIXED_COLOR });
  }

  entries
    .filter((e) => e.percentage > 0)
    .forEach((e, i) => {
      const amount = (e.percentage / 100) * distributable;
      data.push({ name: e.name || 'Unnamed', value: amount, color: colors[i % colors.length] });
    });

  if (data.length === 0) {
    data.push({ name: 'Unallocated', value: 100, color: '#1a1d27' });
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col items-center min-h-[400px]">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 self-start mb-4">
        Portfolio Distribution
      </h3>

      <div className="relative w-64 h-64 flex items-center justify-center">
        <PieChart width={256} height={256}>
          <Pie
            data={data}
            cx={128}
            cy={128}
            innerRadius={90}
            outerRadius={115}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-gray-100">
            {fmt(totalBudget, currency)}
          </span>
          <span className="text-[10px] text-gray-400 uppercase tracking-tight">
            Monthly Income
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full mt-4 space-y-1.5 max-h-32 overflow-y-auto">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-gray-300 truncate max-w-[140px]">{d.name}</span>
            </div>
            <span className="text-gray-400 font-mono">{fmt(d.value, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioDonutChart;
