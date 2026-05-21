/**
 * NetWorthChart
 *
 * Pure rendering layer for the net-worth timeline. Owns the Recharts
 * line chart, axis configuration, the custom dot with click handling,
 * and per-series styling. All data shaping (filtering, currency
 * normalization, variation transform, tooltip formatting) lives in
 * `useNetWorthChartData` so this component can be reused with any
 * snapshot source as long as the caller threads the result through.
 */

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

import { formatCurrencyAmount } from '../CurrencyAmount';
import {
    CHART_CURRENCY_FORMAT_OPTIONS,
    CURRENCY_LINE_COLORS,
    NET_WORTH_TOTAL_LINE_NAME,
    type NetWorthChartDatum,
    type NetWorthTooltipFormatter,
    type NetWorthViewMode,
} from '../../hooks/useNetWorthChartData';

// Recharts hands `r` and `strokeWidth` to dot render callbacks as
// `string | number | undefined` depending on the call site, so widen the
// types here to keep the JSX prop signatures happy without casting.
type DotProps = {
    cx?: number;
    cy?: number;
    fill?: string;
    payload?: NetWorthChartDatum;
    value?: number | null;
    r?: number | string;
    strokeWidth?: number | string;
};

const DEFAULT_LINE_COLOR = '#8884d8';

export interface NetWorthChartProps {
    chartData: NetWorthChartDatum[];
    currencies: string[];
    viewMode: NetWorthViewMode;
    showVariation: boolean;
    primaryCurrency: string;
    tooltipFormatter: NetWorthTooltipFormatter;
    /**
     * Invoked when the user clicks a chart dot. The widget uses this to
     * resolve the matching snapshot and open the edit modal.
     */
    onPointClick: (datum: NetWorthChartDatum) => void;
}

const NetWorthChart = ({
    chartData,
    currencies,
    viewMode,
    showVariation,
    primaryCurrency,
    tooltipFormatter,
    onPointClick,
}: NetWorthChartProps) => {
    // Defined inside the component so it can close over `onPointClick`
    // without forcing the chart to thread it through Recharts' element
    // cloning. Recharts re-creates dot elements on every render anyway,
    // so the per-render identity is not a regression.
    const CustomDot = (props: DotProps) => {
        const { cx, cy, fill, payload, value, r = 5, strokeWidth = 2 } = props;
        if (value === null || value === undefined) return null;
        if (cx === undefined || cy === undefined) return null;

        return (
            <g
                className="cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    if (payload) onPointClick(payload);
                }}
            >
                {/* Larger transparent hit area so users don't have to
                    pixel-hunt the dot to open the edit modal. */}
                <circle cx={cx} cy={cy} r={12} fill="transparent" />
                {/* Visible dot */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={strokeWidth}
                    className="transition-all duration-200"
                    style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}
                />
            </g>
        );
    };

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        className="text-gray-600 dark:text-gray-400"
                    />
                    <YAxis
                        tickFormatter={(value) =>
                            showVariation
                                ? `${value.toFixed(0)}%`
                                : formatCurrencyAmount(
                                      value,
                                      primaryCurrency,
                                      CHART_CURRENCY_FORMAT_OPTIONS,
                                  )
                        }
                        tick={{ fontSize: 12 }}
                        width={showVariation ? 50 : 80}
                        className="text-gray-600 dark:text-gray-400"
                        domain={showVariation ? [-100, 100] : ['auto', 'auto']}
                    />
                    <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{
                            backgroundColor: 'var(--tooltip-bg, #fff)',
                            borderColor: 'var(--tooltip-border, #e5e7eb)',
                            borderRadius: '8px',
                        }}
                    />
                    <Legend />

                    {viewMode === 'total' ? (
                        <Line
                            type="monotone"
                            dataKey="total"
                            name={NET_WORTH_TOTAL_LINE_NAME}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={<CustomDot />}
                            activeDot={<CustomDot r={8} strokeWidth={3} />}
                        />
                    ) : (
                        currencies.map((currency) => {
                            const lineColor =
                                CURRENCY_LINE_COLORS[currency] || DEFAULT_LINE_COLOR;
                            return (
                                <Line
                                    key={currency}
                                    type="monotone"
                                    dataKey={currency}
                                    name={currency}
                                    stroke={lineColor}
                                    strokeWidth={2}
                                    dot={(props: DotProps) => (
                                        <CustomDot {...props} fill={lineColor} />
                                    )}
                                    activeDot={(props: DotProps) => (
                                        <CustomDot
                                            {...props}
                                            fill={lineColor}
                                            r={8}
                                            strokeWidth={3}
                                        />
                                    )}
                                />
                            );
                        })
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default NetWorthChart;
