import Card from '../Card';
import AnimatedProgressBar from '../AnimatedProgressBar';
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
            <Card padding="md" className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Initial Amount:</span>
                    <span className="text-xl font-bold text-blue-900 dark:text-blue-200">
                        {initialAmount.toLocaleString(undefined, {
                            style: 'currency',
                            currency,
                        })}
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Fixed Expenses:</span>
                        <span className="text-lg font-semibold text-blue-800 dark:text-blue-300">
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
                    <div className="text-xs text-gray-600 dark:text-gray-400 text-right">
                        {percentageUsed.toFixed(1)}% of initial amount
                    </div>
                </div>
            </Card>

            {/* Safe to Spend Indicator */}
            {isSafe && remaining > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/80 to-cyan-600/80 p-[2px] shadow-xl shadow-teal-500/20">
                    <div className="relative h-full rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/50 dark:from-slate-900/50 dark:to-teal-900/20 backdrop-blur-xl p-6">
                        {/* Glowing orbs */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30" style={{ animationDelay: '1s' }} />

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl shadow-md border border-teal-200 dark:border-teal-800/50">
                                    <Sparkles className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        Safe to Spend
                                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                        After fixed expenses
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black bg-gradient-to-r from-slate-700 to-teal-700 dark:from-slate-300 dark:to-teal-300 bg-clip-text text-transparent">
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
                <Card padding="md" className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800">
                    <div className="flex items-center justify-between">
                        <span className="text-red-800 dark:text-red-200 font-bold text-lg">⚠️ Over Budget:</span>
                        <span className="text-2xl font-bold text-red-600 dark:text-red-400">
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
