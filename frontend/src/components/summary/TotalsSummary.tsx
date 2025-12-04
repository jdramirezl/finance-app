import type { Currency } from '../../types';
import { currencyService } from '../../services/currencyService';
import Card from '../Card';

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
            {/* Consolidated Total */}
            <Card variant="highlighted" className="border-blue-300 dark:border-blue-700">
                <div className="text-sm text-blue-700 dark:text-blue-300 mb-1 font-medium">
                    Total ({primaryCurrency})
                </div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {currencyService.formatCurrency(consolidatedTotal, primaryCurrency)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    All currencies converted
                </div>
            </Card>

            {/* Individual Currency Totals */}
            {currencies.map((currency) => (
                <Card key={currency}>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Total ({currency})
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {currencyService.formatCurrency(totalsByCurrency[currency], currency)}
                    </div>
                </Card>
            ))}
        </div>
    );
};

export default TotalsSummary;
