import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

import { useExchangeRateHistoryQuery } from '../../hooks/queries/useReportsQueries';
import { SUPPORTED_CURRENCIES } from '../../constants/currencies';

const CURRENCY_PAIRS = SUPPORTED_CURRENCIES.flatMap((base) =>
  SUPPORTED_CURRENCIES.filter((t) => t !== base).map((target) => ({
    label: `${base} → ${target}`,
    base,
    target,
  }))
);

const ExchangeRateTrend = () => {
  const [selectedPair, setSelectedPair] = useState(
    CURRENCY_PAIRS.find((p) => p.base === 'USD' && p.target === 'COP') ?? CURRENCY_PAIRS[0]
  );
  const [days, setDays] = useState(90);

  const { data, isLoading } = useExchangeRateHistoryQuery(
    selectedPair.base,
    selectedPair.target,
    days
  );

  const chartData = data?.data ?? [];
  const hasData = chartData.length > 1;

  const currentRate = hasData ? chartData[chartData.length - 1].rate : null;
  const firstRate = hasData ? chartData[0].rate : null;
  const pctChange =
    currentRate && firstRate ? ((currentRate - firstRate) / firstRate) * 100 : null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={`${selectedPair.base}_${selectedPair.target}`}
          onChange={(e) => {
            const [base, target] = e.target.value.split('_');
            const pair = CURRENCY_PAIRS.find((p) => p.base === base && p.target === target);
            if (pair) setSelectedPair(pair);
          }}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
        >
          {CURRENCY_PAIRS.map((p) => (
            <option key={`${p.base}_${p.target}`} value={`${p.base}_${p.target}`}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {[30, 90, 180, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Current rate + change */}
      {currentRate != null && (
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currentRate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </span>
          {pctChange != null && (
            <span
              className={`flex items-center gap-1 text-sm font-medium ${
                pctChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {pctChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {pctChange >= 0 ? '+' : ''}
              {pctChange.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />
      ) : !hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm font-medium">Collecting data...</p>
          <p className="text-xs mt-1 opacity-75">
            The chart will populate as exchange rates are recorded over time.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)} // MM-DD
            />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number) => [
                value.toLocaleString(undefined, { maximumFractionDigits: 4 }),
                'Rate',
              ]}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default ExchangeRateTrend;
