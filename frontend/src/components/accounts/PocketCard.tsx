import { memo } from 'react';
import type { Pocket } from '../../types';
import { Edit2, Trash2, ArrowRightLeft, Lock, PieChart, Banknote, Wallet } from 'lucide-react';
import ActionButtons from '../ui/ActionButtons';

interface PocketCardProps {
    pocket: Pocket;
    /**
     * Receives the full pocket so the parent can hold a single stable
     * callback (via useCallback). Without this, every keystroke in
     * unrelated form state would re-create the arrow and force every
     * pocket card to re-render.
     */
    onEdit: (pocket: Pocket) => void;
    onDelete: (id: string) => void;
    /**
     * Optional migrate handler. The card hides the Migrate button for
     * non-fixed pockets, so the parent can pass a single stable callback
     * for all rows.
     */
    onMigrate?: (pocket: Pocket) => void;
    isDeleting?: boolean;
}

/**
 * Renders a single pocket row inside an account's pocket list. Memoized
 * so reordering or editing one pocket does not re-render the others.
 */
const PocketCard = ({
    pocket,
    onEdit,
    onDelete,
    onMigrate,
    isDeleting = false,
}: PocketCardProps) => {
    const isFixed = pocket.type === 'fixed';
    const isInvestment = pocket.name === 'Shares' || pocket.name === 'Invested Money';

    let icon = null;
    let iconColor = 'text-gray-500 dark:text-gray-400';

    if (isFixed) {
        icon = <Lock className="w-4 h-4" aria-hidden="true" />;
        iconColor = 'text-blue-600 dark:text-blue-400';
    } else if (isInvestment) {
        icon = pocket.name === 'Shares'
            ? <PieChart className="w-4 h-4" aria-hidden="true" />
            : <Banknote className="w-4 h-4" aria-hidden="true" />;
        iconColor = 'text-amber-500 dark:text-amber-400';
    } else {
        icon = <Wallet className="w-4 h-4" aria-hidden="true" />;
    }

    const showMigrate = isFixed && onMigrate;

    return (
        <div className="flex items-center justify-between p-3 rounded-lg group transition-all bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {icon && (
                    <div className={`p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md flex-shrink-0 ${iconColor}`}>
                        {icon}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{pocket.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {isFixed ? 'Fixed Expense' : (isInvestment ? 'Investment' : pocket.type)} •{' '}
                        <span>
                            {pocket.balance.toLocaleString(undefined, {
                                style: 'currency',
                                currency: pocket.currency,
                            })}
                        </span>
                    </p>
                </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-2">
                <ActionButtons
                    showOnHover
                    actions={[
                        ...(showMigrate ? [{
                            icon: ArrowRightLeft,
                            onClick: () => onMigrate!(pocket),
                            label: 'Migrate',
                            variant: 'ghost' as const,
                        }] : []),
                        {
                            icon: Edit2,
                            onClick: () => onEdit(pocket),
                            label: 'Edit',
                            variant: 'ghost' as const,
                        },
                        {
                            icon: Trash2,
                            onClick: () => onDelete(pocket.id),
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

export default memo(PocketCard);
