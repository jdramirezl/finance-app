import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQueries } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';

import { useSettingsQuery, useAccountsQuery } from '../../hooks/queries';
import { reportService } from '../../services/reportService';
import type { Currency } from '../../types';

const CURRENCY_COLORS: Record<string, string> = {
  USD: '#4cd7f6',
  MXN: '#ffb873',
  EUR: '#adc6ff',
  GBP: '#34d399',
  COP: '#a78bfa',
};

const ExchangeRateTrend = () => {
  const [days, setDays] = useState(90);
  const { data: settings } = useSettingsQuery();
  const { data: accounts } = useAccountsQuery();

  const primaryCurrency = settings?.primaryCurrency ?? 'COP';

  // Get unique currencies from user's accounts that differ from primary
  const targetCurrencies = useMemo(() => {
    if (!accounts) return [];
    const unique = [...new Set(accounts.map((a) => a.currency))];
    return unique.filter((c) => c !== primaryCurrency) as Currency[];
  }, [accounts, primaryCurrency]);

  // Fetch exchange rate history for each pair (base → primary)
  const rateQueries = useQueries({
    queries: targetCurrencies.map((currency) => ({
      queryKey: ['reports', 'exchange-rate-history', currency, primaryCurrency, days],
      queryFn: () => reportService.getExchangeRateHistory(currency, primaryCurrency, days),
      staleTime: 1000 * 60 * 30,
      enabled: !!currency,
    })),
  });

  const isLoading = rateQueries.some((q) => q.isLoading);

  // Normalize all series to % change and merge into unified chart data
  const chartData = useMemo(() => {
    if (targetCurrencies.length === 0) return [];

    // Collect all dates across all series
    const dateMap = new Map<string, Record<string, number>>();

    targetCurrencies.forEach((currency, i) => {
      const entries = rateQueries[i]?.data?.data;
      if (!entries || entries.length === 0) return;
      const baseline = entries[0].rate;
      if (baseline === 0) return;

      entries.forEach(({ date, rate }) => {
        const pctChange = ((rate - baseline) / baseline) * 100;
        const existing = dateMap.get(date) ?? {};
        existing[currency] = pctChange;
        existing[`${currency}_rate`] = rate;
        dateMap.set(date, existing);
      });
    });

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));
  }, [targetCurrencies, rateQueries]);

  const hasData = chartData.length > 1;

  return (
    <div className="space-y-4">
      {/* Day range buttons */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-fit">
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

      {/* Chart */}
      {isLoading ? (
        <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />
      ) : !hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm font-medium">Collecting rate data...</p>
          <p className="text-xs mt-1 opacity-75">
            Chart will populate over time.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number, name: string) => {
                const rateKey = `${name}_rate`;
                const point = chartData.find(
                  (d) => d[name as keyof typeof d] === value
                );
                const rate = point?.[rateKey as keyof typeof point] as number | undefined;
                const label = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%${rate != null ? ` (${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })})` : ''}`;
                return [label, `${name}→${primaryCurrency}`];
              }}
            />
            <Legend />
            {targetCurrencies.map((currency) => (
              <Line
                key={currency}
                type="monotone"
                dataKey={currency}
                name={currency}
                stroke={CURRENCY_COLORS[currency] ?? '#888'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default ExchangeRateTrend;
