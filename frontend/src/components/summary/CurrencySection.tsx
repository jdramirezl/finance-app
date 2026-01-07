import type { Account, Pocket, Currency, CDInvestmentAccount, AccountCardDisplayMode } from '../../types';
import AccountSummaryCard from './AccountSummaryCard';
import AccountSummaryCardCompact from './AccountSummaryCardCompact';
import InvestmentCard, { type InvestmentData } from './InvestmentCard';
import InvestmentCardCompact from './InvestmentCardCompact';
import CDSummaryCard from './CDSummaryCard';
import CDSummaryCardCompact from './CDSummaryCardCompact';
import Card from '../Card';
import { Banknote } from 'lucide-react';

interface CurrencySectionProps {
    currency: Currency;
    accounts: Account[];
    pockets: Pocket[];
    investmentData: Map<string, InvestmentData>;
    refreshingPrices: Set<string>;
    onRefreshPrice: (account: Account) => void;
    // Display mode settings
    normalAccountDisplayMode?: AccountCardDisplayMode;
    investmentAccountDisplayMode?: AccountCardDisplayMode;
    cdAccountDisplayMode?: AccountCardDisplayMode;
}

const CurrencySection = ({
    currency,
    accounts,
    pockets,
    investmentData,
    refreshingPrices,
    onRefreshPrice,
    normalAccountDisplayMode = 'detailed',
    investmentAccountDisplayMode = 'detailed',
    cdAccountDisplayMode = 'detailed',
}: CurrencySectionProps) => {
    // Helper to check if account is a CD
    const isCDAccount = (account: Account): account is CDInvestmentAccount => {
        // For CD accounts, we only need to check the type since investmentType might not be set correctly
        const isCD = account.type === 'cd';
        return isCD;
    };

    // Sort: CD first, then investment, then others
    const sortedAccounts = [...accounts].sort((a, b) => {
        if (isCDAccount(a) && !isCDAccount(b)) return -1;
        if (!isCDAccount(a) && isCDAccount(b)) return 1;
        if (a.type === 'investment' && b.type !== 'investment') return -1;
        if (a.type !== 'investment' && b.type === 'investment') return 1;
        return 0;
    });

    console.log('📊 CurrencySection rendering accounts:', {
        currency,
        totalAccounts: accounts.length,
        sortedAccounts: sortedAccounts.map(acc => ({
            name: acc.name,
            type: acc.type,
            investmentType: acc.investmentType,
            isCD: isCDAccount(acc)
        }))
    });

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    {currency} Accounts
                </h3>
            </div>
            <div className="space-y-6">
                {sortedAccounts.map((account) => {
                    const accountPockets = pockets.filter(p => p.accountId === account.id);

                    if (isCDAccount(account)) {
                        return cdAccountDisplayMode === 'compact' ? (
                            <CDSummaryCardCompact
                                key={account.id}
                                account={account}
                            />
                        ) : (
                            <CDSummaryCard
                                key={account.id}
                                account={account}
                            />
                        );
                    }

                    if (account.type === 'investment') {
                        return investmentAccountDisplayMode === 'compact' ? (
                            <InvestmentCardCompact
                                key={account.id}
                                account={account}
                                data={investmentData.get(account.id)}
                                isRefreshing={refreshingPrices.has(account.id)}
                                onRefresh={() => onRefreshPrice(account)}
                            />
                        ) : (
                            <InvestmentCard
                                key={account.id}
                                account={account}
                                data={investmentData.get(account.id)}
                                isRefreshing={refreshingPrices.has(account.id)}
                                onRefresh={() => onRefreshPrice(account)}
                            />
                        );
                    }

                    return normalAccountDisplayMode === 'compact' ? (
                        <AccountSummaryCardCompact
                            key={account.id}
                            account={account}
                            pockets={accountPockets}
                        />
                    ) : (
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
