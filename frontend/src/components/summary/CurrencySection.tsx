import type { Account, Pocket, Currency } from '../../types';
import AccountSummaryCard from './AccountSummaryCard';
import InvestmentCard, { type InvestmentData } from './InvestmentCard';
import Card from '../Card';

interface CurrencySectionProps {
    currency: Currency;
    accounts: Account[];
    pockets: Pocket[];
    investmentData: Map<string, InvestmentData>;
    refreshingPrices: Set<string>;
    onRefreshPrice: (account: Account) => void;
}

const CurrencySection = ({
    currency,
    accounts,
    pockets,
    investmentData,
    refreshingPrices,
    onRefreshPrice,
}: CurrencySectionProps) => {
    // Sort: investment first, then others
    const sortedAccounts = [...accounts].sort((a, b) => {
        if (a.type === 'investment' && b.type !== 'investment') return -1;
        if (a.type !== 'investment' && b.type === 'investment') return 1;
        return 0;
    });

    return (
        <Card>
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
                {currency}
            </div>
            <div className="space-y-6">
                {sortedAccounts.map((account) => {
                    const accountPockets = pockets.filter(p => p.accountId === account.id);

                    if (account.type === 'investment') {
                        return (
                            <InvestmentCard
                                key={account.id}
                                account={account}
                                data={investmentData.get(account.id)}
                                isRefreshing={refreshingPrices.has(account.id)}
                                onRefresh={() => onRefreshPrice(account)}
                            />
                        );
                    }

                    return (
                        <AccountSummaryCard
                            key={account.id}
                            account={account}
                            pockets={accountPockets}
                        />
                    );
                })}
            </div>
        </Card>
    );
};

export default CurrencySection;
