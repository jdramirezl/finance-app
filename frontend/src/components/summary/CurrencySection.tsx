import { useMemo } from 'react';
import type { Account, Pocket, Currency, CDInvestmentAccount, AccountCardDisplayMode } from '../../types';
import AccountSummaryCard from './AccountSummaryCard';
import AccountSummaryCardCompact from './AccountSummaryCardCompact';
import InvestmentCard, { type InvestmentData } from './InvestmentCard';
import InvestmentCardCompact from './InvestmentCardCompact';
import CDSummaryCard from './CDSummaryCard';
import CDSummaryCardCompact from './CDSummaryCardCompact';
import Card from '../ui/Card';
import { Banknote } from 'lucide-react';
import type { InvestmentCacheInfo } from '../../hooks/useInvestmentPrices';

interface CurrencySectionProps {
    currency: Currency;
    accounts: Account[];
    pockets: Pocket[];
    investmentData: Map<string, InvestmentData>;
    isRefreshing: (accountId: string) => boolean;
    getCacheInfo: (symbol: string) => InvestmentCacheInfo;
    onRefreshPrice: (account: Account) => void;
    // Display mode settings
    normalAccountDisplayMode?: AccountCardDisplayMode;
    investmentAccountDisplayMode?: AccountCardDisplayMode;
    cdAccountDisplayMode?: AccountCardDisplayMode;
}

const isCDAccount = (account: Account): account is CDInvestmentAccount =>
    account.type === 'cd';

const EMPTY_POCKETS: Pocket[] = [];

const CurrencySection = ({
    currency,
    accounts,
    pockets,
    investmentData,
    isRefreshing,
    getCacheInfo,
    onRefreshPrice,
    normalAccountDisplayMode = 'detailed',
    investmentAccountDisplayMode = 'detailed',
    cdAccountDisplayMode = 'detailed',
}: CurrencySectionProps) => {
    // Build pockets-by-account map once so each AccountSummaryCard receives a
    // stable array reference (essential for React.memo to skip re-renders).
    const pocketsByAccount = useMemo(() => {
        const map = new Map<string, Pocket[]>();
        for (const p of pockets) {
            const list = map.get(p.accountId);
            if (list) {
                list.push(p);
            } else {
                map.set(p.accountId, [p]);
            }
        }
        return map;
    }, [pockets]);

    // Sort: CD first, then investment, then others. useMemo so we don't redo
    // the spread+sort on every parent re-render.
    const sortedAccounts = useMemo(() => {
        return [...accounts].sort((a, b) => {
            if (isCDAccount(a) && !isCDAccount(b)) return -1;
            if (!isCDAccount(a) && isCDAccount(b)) return 1;
            if (a.type === 'investment' && b.type !== 'investment') return -1;
            if (a.type !== 'investment' && b.type === 'investment') return 1;
            return 0;
        });
    }, [accounts]);

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
                    const accountPockets = pocketsByAccount.get(account.id) ?? EMPTY_POCKETS;

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
                                isRefreshing={isRefreshing}
                                getCacheInfo={getCacheInfo}
                                onRefresh={onRefreshPrice}
                            />
                        ) : (
                            <InvestmentCard
                                key={account.id}
                                account={account}
                                data={investmentData.get(account.id)}
                                isRefreshing={isRefreshing}
                                getCacheInfo={getCacheInfo}
                                onRefresh={onRefreshPrice}
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
