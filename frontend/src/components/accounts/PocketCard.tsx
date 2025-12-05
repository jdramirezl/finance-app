import type { Pocket } from '../../types';
import { Edit2, Trash2, ArrowRightLeft, Lock, PieChart, Banknote, Wallet } from 'lucide-react';
import ActionButtons from '../ActionButtons';

interface PocketCardProps {
    pocket: Pocket;
    onEdit: () => void;
    onDelete: () => void;
    onMigrate?: () => void;
    isDeleting?: boolean;
}

const PocketCard = ({
    pocket,
    onEdit,
    onDelete,
    onMigrate,
    isDeleting = false,
}: PocketCardProps) => {
    const isFixed = pocket.type === 'fixed';
    const isInvestment = pocket.name === 'Shares' || pocket.name === 'Invested Money'; // Simple heuristic based on current app logic

    let icon = null;
    let bgClass = "bg-gray-50 dark:bg-gray-700/50";
    let borderClass = "";

    if (isFixed) {
        icon = <Lock className="w-4 h-4 text-blue-500" />;
        bgClass = "bg-blue-50 dark:bg-blue-900/20";
        borderClass = "border-l-4 border-l-blue-500";
    } else if (isInvestment) {
        icon = pocket.name === 'Shares' ? <PieChart className="w-4 h-4 text-purple-500" /> : <Banknote className="w-4 h-4 text-purple-500" />;
        bgClass = "bg-purple-50 dark:bg-purple-900/20";
        borderClass = "border-l-4 border-l-purple-500";
    } else {
        // Normal pockets
        icon = <Wallet className="w-4 h-4 text-slate-500" />;
        bgClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm";
        borderClass = "border-l-4 border-l-slate-400 dark:border-l-slate-600";
    }

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg group transition-all ${bgClass} ${borderClass}`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                        {icon}
                    </div>
                )}
                <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{pocket.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isFixed ? 'Fixed Expense' : (isInvestment ? 'Investment' : pocket.type)} •{' '}
                        {pocket.balance.toLocaleString(undefined, {
                            style: 'currency',
                            currency: pocket.currency,
                        })}
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <ActionButtons
                    showOnHover
                    actions={[
                        ...(onMigrate ? [{
                            icon: ArrowRightLeft,
                            onClick: onMigrate,
                            label: 'Migrate',
                            variant: 'ghost' as const,
                        }] : []),
                        {
                            icon: Edit2,
                            onClick: onEdit,
                            label: 'Edit',
                            variant: 'ghost' as const,
                        },
                        {
                            icon: Trash2,
                            onClick: onDelete,
                            label: 'Delete',
                            variant: 'ghost' as const,
                            loading: isDeleting,
                        }
                    ]}
                />
            </div>
        </div>
    );
};

export default PocketCard;
