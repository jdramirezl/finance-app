import Card from '../ui/Card';
import AnimatedProgressBar from '../ui/AnimatedProgressBar';
import { Sparkles } from 'lucide-react';

interface BudgetSummaryCardProps {
    initialAmount: number;
    totalFixedExpenses: number;
    remaining: number;
    currency: string;
}

const BudgetSummaryCard = ({
    initialAmount,
    totalFixedExpenses,
    remaining,
    currency,
}: BudgetSummaryCardProps) => {
    const percentageUsed = initialAmount > 0 ? (totalFixedExpenses / initialAmount) * 100 : 0;
    const isSafe = remaining > 0;

    return (
        <div className="space-y-4">
            <Card padding="md" className="bg-[rgba(27,33,34,0.8)] backdrop-blur-[12px] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-medium">Initial Amount:</span>
                    <span className="text-xl font-bold text-on-surface font-mono">
                        {initialAmount.toLocaleString(undefined, {
                            style: 'currency',
                            currency,
                        })}
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-on-surface-variant font-medium">Fixed Expenses:</span>
                        <span className="text-lg font-semibold text-primary font-mono">
                            {totalFixedExpenses.toLocaleString(undefined, {
                                style: 'currency',
                                currency,
                            })}
                        </span>
                    </div>
                    <AnimatedProgressBar
                        value={totalFixedExpenses}
                        max={initialAmount}
                        color="blue"
                        showPercentage={false}
                        height="md"
                    />
                    <div className="text-xs text-on-surface-variant text-right font-mono">
                        {percentageUsed.toFixed(1)}% of initial amount
                    </div>
                </div>
            </Card>

            {/* Safe to Spend Indicator */}
            {isSafe && remaining > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#06b6d4]/80 to-[#22d3ee]/80 p-[2px] shadow-xl shadow-[#06b6d4]/20">
                    <div className="relative h-full rounded-2xl bg-[rgba(27,33,34,0.9)] backdrop-blur-xl p-6">
                        {/* Glowing orbs */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#4cd7f6]/20 rounded-full filter blur-3xl opacity-30" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#06b6d4]/20 rounded-full filter blur-3xl opacity-30" />

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-surface-container-highest rounded-xl border border-white/[0.08]">
                                    <Sparkles className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-on-surface flex items-center gap-2">
                                        Safe to Spend
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    </div>
                                    <div className="text-xs text-on-surface-variant">
                                        After fixed expenses
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-primary font-mono">
                                    {remaining.toLocaleString(undefined, {
                                        style: 'currency',
                                        currency,
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Negative balance warning */}
            {!isSafe && (
                <Card padding="md" className="bg-[#93000a]/20 border-2 border-[#ffb4ab]/30">
                    <div className="flex items-center justify-between">
                        <span className="text-[#ffb4ab] font-bold text-lg">⚠️ Over Budget:</span>
                        <span className="text-2xl font-bold text-[#ffb4ab] font-mono">
                            {remaining.toLocaleString(undefined, {
                                style: 'currency',
                                currency,
                            })}
                        </span>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default BudgetSummaryCard;
