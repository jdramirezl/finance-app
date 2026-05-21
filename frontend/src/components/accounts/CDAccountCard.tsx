import { memo, useState } from 'react';
import type { CDInvestmentAccount, Pocket } from '../../types';
import type { CDCalculationResult } from '../../types';
import { Landmark, GripVertical, Edit2, Trash2, ChevronDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { cdCalculationService } from '../../services/cdCalculationService';

interface CDAccountCardProps {
    account: CDInvestmentAccount;
    isSelected?: boolean;
    pockets?: Pocket[];
    onSelect: (account: CDInvestmentAccount) => void;
    onEdit: (account: CDInvestmentAccount) => void;
    onDelete: (id: string) => void;
    onAddPocket?: () => void;
    isDeleting?: boolean;
}

const CDAccountCard = ({
    account,
    pockets = [],
    onSelect,
    onEdit,
    onDelete,
    onAddPocket,
    isDeleting = false,
}: CDAccountCardProps) => {
    const [pocketsExpanded, setPocketsExpanded] = useState(false);

    let calculation: CDCalculationResult | null = null;
    let hasError = false;
    let isNearMaturity = false;

    try {
        calculation = cdCalculationService.calculateCurrentValue(account);
        isNearMaturity = cdCalculationService.isNearMaturity(account);
    } catch {
        hasError = true;
    }

    const displayBalance = hasError ? 0 : (calculation?.currentValue || 0);

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
                            <Landmark className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg text-on-surface">{account.name}</h3>
                                {isNearMaturity && !hasError && (
                                    <AlertTriangle className="w-4 h-4 text-tertiary" aria-hidden="true" />
                                )}
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                                CERTIFICATE OF DEPOSIT
                                {account.interestRate && ` · ${account.interestRate}% APY`}
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
                        {displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {!hasError && calculation && calculation.accruedInterest > 0 && (
                        <div className="flex items-center gap-1 text-xs text-success mt-1">
                            <TrendingUp className="w-3 h-3" aria-hidden="true" />
                            <span className="font-mono">
                                +{calculation.accruedInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}
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

export default memo(CDAccountCard);
