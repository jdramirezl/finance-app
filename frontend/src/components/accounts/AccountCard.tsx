import { memo, useState } from 'react';
import type { Account, Pocket } from '../../types';
import { TrendingUp, Wallet, Lock, GripVertical, Edit2, Trash2, ChevronDown } from 'lucide-react';

interface AccountCardProps {
    account: Account;
    isSelected?: boolean;
    pockets?: Pocket[];
    onSelect: (account: Account) => void;
    onEdit: (account: Account) => void;
    onDelete: (id: string) => void;
    onAddPocket?: () => void;
    isDeleting?: boolean;
    isFixedExpensesAccount?: boolean;
}

function getAccountIcon(account: Account) {
    if (account.type === 'cd') return <Lock className="w-5 h-5" aria-hidden="true" />;
    if (account.type === 'investment') return <TrendingUp className="w-5 h-5" aria-hidden="true" />;
    return <Wallet className="w-5 h-5" aria-hidden="true" />;
}

function getTypeLabel(account: Account, isFixedExpensesAccount: boolean) {
    if (isFixedExpensesAccount) return 'FIXED EXPENSES';
    if (account.type === 'cd') return 'CERTIFICATE OF DEPOSIT';
    if (account.type === 'investment') return 'INVESTMENT';
    return 'NORMAL ACCOUNT';
}

const AccountCard = ({
    account,
    pockets = [],
    onSelect,
    onEdit,
    onDelete,
    onAddPocket,
    isDeleting = false,
    isFixedExpensesAccount = false,
}: AccountCardProps) => {
    const [pocketsExpanded, setPocketsExpanded] = useState(false);

    return (
        <div
            onClick={() => onSelect(account)}
            className="glass-card rounded-xl overflow-hidden flex flex-col relative border-t-4 transition-transform hover:scale-[1.01] shadow-xl group cursor-pointer"
            style={{ borderTopColor: account.color }}
        >
            <div className="p-5 flex-1">
                {/* Header: icon + name + type + hover actions */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${account.color}20`, color: account.color }}
                        >
                            {getAccountIcon(account)}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-on-surface">{account.name}</h3>
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                                {getTypeLabel(account, isFixedExpensesAccount)}
                            </p>
                        </div>
                    </div>
                    <div
                        className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="p-1 hover:text-primary transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-[18px] h-[18px]" aria-hidden="true" />
                        </button>
                        <button className="p-1 hover:text-primary transition-colors" onClick={() => onEdit(account)}>
                            <Edit2 className="w-[18px] h-[18px]" aria-hidden="true" />
                        </button>
                        <button
                            className="p-1 hover:text-error transition-colors"
                            onClick={() => onDelete(account.id)}
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Currency badge + Balance */}
                <div className="mb-6">
                    <span
                        className="inline-block px-2 py-0.5 rounded font-mono text-[10px] mb-2 tracking-widest"
                        style={{ backgroundColor: `${account.color}1a`, color: account.color }}
                    >
                        {account.currency}
                    </span>
                    <div
                        className="font-mono text-[28px] tracking-tight"
                        style={{ color: account.color }}
                    >
                        {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Collapsible Pockets */}
                <div className="border-t border-white/5 pt-4">
                    <button
                        className="w-full flex justify-between items-center text-on-surface-variant hover:text-on-surface transition-colors mb-2"
                        onClick={(e) => { e.stopPropagation(); setPocketsExpanded(!pocketsExpanded); }}
                    >
                        <span className="text-[12px] font-bold tracking-wider">
                            POCKETS ({pockets.length})
                        </span>
                        <ChevronDown
                            className="w-4 h-4 transition-transform duration-300"
                            style={{ transform: pocketsExpanded ? 'rotate(180deg)' : undefined }}
                        />
                    </button>
                    <div
                        className="space-y-2 overflow-hidden transition-all duration-300"
                        style={{ maxHeight: pocketsExpanded ? '500px' : '0px' }}
                    >
                        {pockets.length === 0 && (
                            <p className="text-[12px] text-center text-on-surface-variant/40 py-2">No pockets defined</p>
                        )}
                        {pockets.map((pocket) => (
                            <div key={pocket.id} className="flex justify-between items-center p-2 rounded bg-white/5">
                                <span className="text-sm">{pocket.name}</span>
                                <span className="font-mono text-sm">
                                    {pocket.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                        {onAddPocket && (
                            <button
                                className="w-full py-2 border border-dashed border-white/20 rounded text-[11px] font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-colors mt-2"
                                onClick={(e) => { e.stopPropagation(); onAddPocket(); }}
                            >
                                + ADD POCKET
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(AccountCard);
