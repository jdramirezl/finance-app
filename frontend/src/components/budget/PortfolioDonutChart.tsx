import { PieChart, Pie, Cell, Tooltip } from 'recharts';
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

// Blue tonalities for allocations (savings/positive)
const ALLOCATION_BLUES = [
  '#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8',
  '#7dd3fc', '#38bdf8', '#0ea5e9', '#a5b4fc', '#818cf8',
];

// Red/orange for fixed expenses (negative/obligations)
const FIXED_COLOR = '#f97316';

const PortfolioDonutChart = ({ entries, distributable, currency, fixedExpensesTotal = 0, income = 0 }: PortfolioDonutChartProps) => {
  const totalBudget = income || (distributable + fixedExpensesTotal);

  const data: { name: string; value: number; color: string; pct: number }[] = [];

  if (fixedExpensesTotal > 0) {
    const pct = totalBudget > 0 ? (fixedExpensesTotal / totalBudget) * 100 : 0;
    data.push({ name: 'Fixed Expenses', value: fixedExpensesTotal, color: FIXED_COLOR, pct });
  }

  entries
    .filter((e) => e.percentage > 0)
    .forEach((e, i) => {
      const amount = (e.percentage / 100) * distributable;
      const pct = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
      data.push({ name: e.name || 'Unnamed', value: amount, color: ALLOCATION_BLUES[i % ALLOCATION_BLUES.length], pct });
    });

  if (data.length === 0) {
    data.push({ name: 'Unallocated', value: 100, color: '#1a1d27', pct: 100 });
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
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-xs shadow-lg">
                  <p className="text-gray-100 font-medium">{d.name}</p>
                  <p className="text-gray-300">{fmt(d.value, currency)} ({d.pct.toFixed(1)}%)</p>
                </div>
              );
            }}
          />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-semibold text-gray-100">
            {fmt(totalBudget, currency)}
          </span>
          <span className="text-[10px] text-gray-400 uppercase tracking-tight">
            Monthly Income
          </span>
        </div>
      </div>

      {/* Legend with percentages */}
      <div className="w-full mt-4 space-y-1.5 max-h-36 overflow-y-auto">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-gray-300 truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-gray-500 font-mono">{d.pct.toFixed(1)}%</span>
              <span className="text-gray-400 font-mono">{fmt(d.value, currency)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioDonutChart;
