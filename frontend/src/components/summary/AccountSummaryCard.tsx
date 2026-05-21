import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Account, Pocket } from '../../types';
import { currencyService } from '../../services/currencyService';
import { Wallet, CreditCard, Banknote, PiggyBank, Lock } from 'lucide-react';
import SelectableValue from '../ui/SelectableValue';

interface AccountSummaryCardProps {
    account: Account;
    pockets: Pocket[];
}

/**
 * Renders one account's detailed summary card on the summary page.
 * Memoized so changes elsewhere on the summary page (refreshing one
 * investment's price, fetching exchange rates, etc.) don't trigger a
 * re-render of every account card.
 *
 * Parents must memoize the `pockets` array per account (for example via a
 * `Map<accountId, Pocket[]>` built once with useMemo) so the array
 * reference stays stable when its contents haven't changed.
 */
const AccountSummaryCard = ({ account, pockets }: AccountSummaryCardProps) => {
    const navigate = useNavigate();

    const handleAccountClick = () => {
        navigate(`/accounts?id=${account.id}`);
    };

    // Get account type icon
    const getAccountIcon = () => {
        switch (account.type) {
            case 'normal':
                if (account.name.toLowerCase().includes('checking')) {
                    return <CreditCard className="w-4 h-4 text-primary" aria-hidden="true" />;
                }
                if (account.name.toLowerCase().includes('savings')) {
                    return <PiggyBank className="w-4 h-4 text-emerald-400" aria-hidden="true" />;
                }
                if (account.name.toLowerCase().includes('cash')) {
                    return <Banknote className="w-4 h-4 text-tertiary" aria-hidden="true" />;
                }
                return <Wallet className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />;
            case 'investment':
                return <Wallet className="w-4 h-4 text-secondary" aria-hidden="true" />;
            case 'cd':
                return <Wallet className="w-4 h-4 text-tertiary" aria-hidden="true" />;
            default:
                return <Wallet className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />;
        }
    };

    // Get account type label
    const getAccountTypeLabel = () => {
        switch (account.type) {
            case 'normal':
                if (account.name.toLowerCase().includes('checking')) {
                    return 'Checking Account';
                }
                if (account.name.toLowerCase().includes('savings')) {
                    return 'Savings Account';
                }
                if (account.name.toLowerCase().includes('cash')) {
                    return 'Cash';
                }
                return 'Account';
            case 'investment':
                return 'Investment Account';
            case 'cd':
                return 'Certificate of Deposit';
            default:
                return 'Account';
        }
    };

    // Calculate pocket distribution for visual representation.
    const totalBalance = account.balance;
    const pocketPercentages = useMemo(
        () =>
            pockets.map((pocket) => ({
                ...pocket,
                percentage: totalBalance > 0 ? (pocket.balance / totalBalance) * 100 : 0,
            })),
        [pockets, totalBalance]
    );

    return (
        <div className="bg-surface-container-high/50 rounded-lg p-4 border-l-4" style={{ borderColor: account.color }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={handleAccountClick}
                    title="View Account Details"
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${account.color}20`, border: `2px solid ${account.color}` }}
                    >
                        {getAccountIcon()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg text-on-surface group-hover:text-primary">
                                {account.name}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-surface-container-highest text-on-surface-variant">
                                {getAccountTypeLabel()}
                            </span>
                        </div>
                        <div className="text-sm text-on-surface-variant">
                            {pockets.length} pocket{pockets.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-on-surface">
                        <SelectableValue id={`acc-sum-bal-${account.id}`} value={account.balance} currency={account.currency}>
                            {currencyService.formatCurrency(account.balance, account.currency)}
                        </SelectableValue>
                    </div>
                    <div className="text-sm text-on-surface-variant">
                        Total Balance
                    </div>
                </div>
            </div>

            {/* Balance Distribution Bar */}
            {pockets.length > 1 && totalBalance > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
                        <span>Balance Distribution</span>
                        <span>{pockets.length} pockets</span>
                    </div>
                    <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
                        <div className="flex h-full">
                            {pocketPercentages.map((pocket, index) => (
                                <div
                                    key={pocket.id}
                                    className="h-full transition-all duration-300"
                                    style={{
                                        width: `${pocket.percentage}%`,
                                        backgroundColor: index === 0 ? account.color :
                                            index === 1 ? `${account.color}80` :
                                                index === 2 ? `${account.color}60` :
                                                    `${account.color}40`
                                    }}
                                    title={`${pocket.name}: ${pocket.percentage.toFixed(1)}%`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pockets List */}
            <div className="space-y-2">
                {pockets.map((pocket, index) => (
                    <div key={pocket.id} className="flex items-center justify-between py-2 px-3 bg-surface-container rounded-md border border-outline-variant">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                    backgroundColor: index === 0 ? account.color :
                                        index === 1 ? `${account.color}80` :
                                            index === 2 ? `${account.color}60` :
                                                `${account.color}40`
                                }}
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-on-surface">
                                        {pocket.name}
                                    </span>
                                    {pocket.type === 'fixed' && (
                                        <div className="flex items-center gap-1">
                                            <Lock className="w-3 h-3 text-primary" aria-hidden="true" />
                                            <span className="text-xs font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                                Fixed
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {totalBalance > 0 && (
                                    <div className="text-xs text-on-surface-variant font-mono">
                                        {((pocket.balance / totalBalance) * 100).toFixed(1)}% of total
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono font-semibold text-on-surface">
                                <SelectableValue id={`pocket-sum-bal-${pocket.id}`} value={pocket.balance} currency={pocket.currency}>
                                    {currencyService.formatCurrency(pocket.balance, pocket.currency)}
                                </SelectableValue>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default memo(AccountSummaryCard);
