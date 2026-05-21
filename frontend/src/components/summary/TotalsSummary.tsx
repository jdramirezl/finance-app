import type { Currency } from '../../types';
import { currencyService } from '../../services/currencyService';
import AnimatedCounter from '../ui/AnimatedCounter';
import SelectableValue from '../ui/SelectableValue';
import { Skeleton } from '../ui/Skeleton';

interface TotalsSummaryProps {
    consolidatedTotal: number;
    primaryCurrency: Currency;
    totalsByCurrency: Record<Currency, number>;
    /**
     * `false` while the cross-currency conversion is still in flight.
     * When `false`, the consolidated card shows a skeleton instead of
     * `$0.00`, which would otherwise be a misleading first paint.
     */
    isConsolidatedReady?: boolean;
}

const TotalsSummary = ({
    consolidatedTotal,
    primaryCurrency,
    totalsByCurrency,
    isConsolidatedReady = true,
}: TotalsSummaryProps) => {
    const currencies = Object.keys(totalsByCurrency) as Currency[];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Consolidated Total - Hero Card */}
            <div className="relative overflow-hidden rounded-2xl bg-surface-container border border-white/[0.08] backdrop-blur-xl p-6">
                {/* Decorative gradient orbs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full filter blur-3xl opacity-30 animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <div className="text-sm font-semibold text-primary uppercase tracking-wider">
                            Net Worth
                        </div>
                    </div>
                    {isConsolidatedReady ? (
                        <div className="text-4xl font-black font-mono text-on-surface mb-1">
                            <SelectableValue id="summary-net-worth" value={consolidatedTotal} currency={primaryCurrency}>
                                <AnimatedCounter
                                    value={consolidatedTotal}
                                    formatValue={(v) => currencyService.formatCurrency(v, primaryCurrency)}
                                />
                            </SelectableValue>
                        </div>
                    ) : (
                        <div className="mb-1" aria-busy="true" aria-label="Calculating net worth">
                            <Skeleton className="h-10 w-48" />
                        </div>
                    )}
                    <div className="text-xs font-medium text-on-surface-variant flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        All currencies consolidated
                    </div>
                </div>
            </div>

            {/* Individual Currency Totals */}
            {currencies.map((currency) => (
                <div
                    key={currency}
                    className="relative overflow-hidden rounded-xl bg-surface-container border border-white/[0.08] backdrop-blur-xl p-5 hover:bg-surface-container-high transition-all duration-200 group"
                >
                    <div className="relative z-10">
                        <div className="text-sm text-on-surface-variant mb-1 font-medium uppercase tracking-wider">
                            {currency}
                        </div>
                        <div className="text-3xl font-bold font-mono text-on-surface group-hover:scale-105 transition-transform duration-200">
                            <SelectableValue id={`summary-total-${currency}`} value={totalsByCurrency[currency]} currency={currency}>
                                <AnimatedCounter
                                    value={totalsByCurrency[currency]}
                                    formatValue={(v) => currencyService.formatCurrency(v, currency)}
                                />
                            </SelectableValue>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TotalsSummary;
