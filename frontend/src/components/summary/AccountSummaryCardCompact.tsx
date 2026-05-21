import { useNavigate } from 'react-router-dom';
import type { Account, Pocket } from '../../types';
import { currencyService } from '../../services/currencyService';
import SelectableValue from '../ui/SelectableValue';

interface AccountSummaryCardCompactProps {
    account: Account;
    pockets: Pocket[];
}

const AccountSummaryCardCompact = ({ account, pockets }: AccountSummaryCardCompactProps) => {
    const navigate = useNavigate();

    const handleAccountClick = () => {
        navigate(`/accounts?id=${account.id}`);
    };

    return (
        <div className="border-l-4 pl-4" style={{ borderColor: account.color }}>
            <div className="flex items-center justify-between mb-2">
                <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={handleAccountClick}
                    title="View Account Details"
                >
                    <div
                        className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
                        style={{ backgroundColor: account.color }}
                    />
                    <span className="font-semibold text-lg text-on-surface group-hover:text-primary">
                        {account.name}
                    </span>
                </div>
                <span className="font-mono text-lg font-semibold text-on-surface">
                    <SelectableValue id={`acc-sum-bal-${account.id}`} value={account.balance} currency={account.currency}>
                        {currencyService.formatCurrency(account.balance, account.currency)}
                    </SelectableValue>
                </span>
            </div>

            <div className="ml-5 space-y-1">
                {pockets.map((pocket) => (
                    <div key={pocket.id} className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant">
                            {pocket.name}
                            {pocket.type === 'fixed' && (
                                <span className="ml-2 text-xs text-primary">
                                    (fixed)
                                </span>
                            )}
                        </span>
                        <span className="font-mono text-on-surface">
                            <SelectableValue id={`pocket-sum-bal-${pocket.id}`} value={pocket.balance} currency={pocket.currency}>
                                {currencyService.formatCurrency(pocket.balance, pocket.currency)}
                            </SelectableValue>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AccountSummaryCardCompact;
