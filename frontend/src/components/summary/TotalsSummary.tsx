import type { Currency } from '../../types';
import { currencyService } from '../../services/currencyService';
import AnimatedCounter from '../AnimatedCounter';
import SelectableValue from '../SelectableValue';

interface TotalsSummaryProps {
    consolidatedTotal: number;
    primaryCurrency: Currency;
    totalsByCurrency: Record<Currency, number>;
}

const TotalsSummary = ({
    consolidatedTotal,
    primaryCurrency,
    totalsByCurrency,
}: TotalsSummaryProps) => {
    const currencies = Object.keys(totalsByCurrency) as Currency[];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Consolidated Total - Glassmorphism Hero Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 p-[2px] shadow-2xl">
                <div className="relative h-full rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-6">
                    {/* Decorative gradient orbs */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                            <div className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                Net Worth
                            </div>
                        </div>
                        <div className="text-4xl font-black bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 dark:from-blue-300 dark:via-blue-200 dark:to-purple-300 bg-clip-text text-transparent mb-1">
                            <SelectableValue id="summary-net-worth" value={consolidatedTotal} currency={primaryCurrency}>
                                <AnimatedCounter
                                    value={consolidatedTotal}
                                    formatValue={(v) => currencyService.formatCurrency(v, primaryCurrency)}
                                />
                            </SelectableValue>
                        </div>
                        <div className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                            All currencies consolidated
                        </div>
                    </div>
                </div>
            </div>

            {/* Individual Currency Totals - Glassmorphism Cards */}
            {currencies.map((currency) => (
                <div
                    key={currency}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-[1px] shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                    <div className="relative h-full rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-5 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all">
                        {/* Subtle gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-xl transition-all duration-300" />

                        <div className="relative z-10">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">
                                {currency}
                            </div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:scale-105 transition-transform duration-200">
                                <SelectableValue id={`summary-total-${currency}`} value={totalsByCurrency[currency]} currency={currency}>
                                    <AnimatedCounter
                                        value={totalsByCurrency[currency]}
                                        formatValue={(v) => currencyService.formatCurrency(v, currency)}
                                    />
                                </SelectableValue>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TotalsSummary;
