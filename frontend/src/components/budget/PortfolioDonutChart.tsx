import { PieChart, Pie, Cell } from 'recharts';
import type { DistributionEntry } from './BudgetEntryRow';

interface PortfolioDonutChartProps {
  entries: DistributionEntry[];
  distributable: number;
  currency: string;
  colors: string[];
}

const fmt = (value: number, currency: string) =>
  value.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });

const PortfolioDonutChart = ({ entries, distributable, currency, colors }: PortfolioDonutChartProps) => {
  const data = entries
    .filter((e) => e.percentage > 0)
    .map((e, i) => ({ name: e.name || 'Unnamed', value: e.percentage, color: colors[i % colors.length] }));

  // Show a placeholder ring when no data
  if (data.length === 0) {
    data.push({ name: 'Unallocated', value: 100, color: '#1a1d27' });
  }

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col items-center min-h-[400px]">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-on-surface-variant self-start mb-4">
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
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold text-on-surface">
            {fmt(distributable, currency)}
          </span>
          <span className="text-[10px] text-on-surface-variant uppercase tracking-tight">
            Total Allocated
          </span>
        </div>
      </div>
    </div>
  );
};

export default PortfolioDonutChart;
