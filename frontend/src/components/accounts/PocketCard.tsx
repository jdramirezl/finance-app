import { memo } from 'react';
import type { Pocket } from '../../types';
import { Archive, Edit2, ArrowRightLeft, Lock, PieChart, Banknote, Wallet } from 'lucide-react';
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
    /**
     * Soft-delete (archive) handler. Pocket cards mirror account cards:
     * the inline action archives the row (reversible) instead of
     * permanently deleting it. Permanent deletion is reachable from the
     * archived list, where the destructive action is in a less
     * accidentally-clickable surface.
     */
    onArchive: (id: string) => void;
    /**
     * Optional migrate handler. The card hides the Migrate button for
     * non-fixed pockets, so the parent can pass a single stable callback
     * for all rows.
     */
    onMigrate?: (pocket: Pocket) => void;
    isArchiving?: boolean;
}

/**
 * Renders a single pocket row inside an account's pocket list. Memoized
 * so reordering or editing one pocket does not re-render the others.
 */
const PocketCard = ({
    pocket,
    onEdit,
    onArchive,
    onMigrate,
    isArchiving = false,
}: PocketCardProps) => {
    const isFixed = pocket.type === 'fixed';
    const isInvestment = pocket.name === 'Shares' || pocket.name === 'Invested Money';

    let icon = null;
    let bgClass = "bg-gray-50 dark:bg-gray-700/50";
    let borderClass = "";

    if (isFixed) {
        icon = <Lock className="w-4 h-4 text-blue-500" aria-hidden="true" />;
        bgClass = "bg-blue-50 dark:bg-blue-900/20";
        borderClass = "border-l-4 border-l-blue-500";
    } else if (isInvestment) {
        icon = pocket.name === 'Shares'
            ? <PieChart className="w-4 h-4 text-purple-500" aria-hidden="true" />
            : <Banknote className="w-4 h-4 text-purple-500" aria-hidden="true" />;
        bgClass = "bg-purple-50 dark:bg-purple-900/20";
        borderClass = "border-l-4 border-l-purple-500";
    } else {
        icon = <Wallet className="w-4 h-4 text-slate-500" aria-hidden="true" />;
        bgClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm";
        borderClass = "border-l-4 border-l-slate-400 dark:border-l-slate-600";
    }

    // Migration is only meaningful for fixed-expense pockets, regardless of
    // whether the parent provided a handler. We hide the action otherwise.
    const showMigrate = isFixed && onMigrate;

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg group transition-all ${bgClass} ${borderClass}`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {icon && (
                    <div className="p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-sm flex-shrink-0">
                        {icon}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{pocket.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {isFixed ? 'Fixed Expense' : (isInvestment ? 'Investment' : pocket.type)} •{' '}
                        {pocket.balance.toLocaleString(undefined, {
                            style: 'currency',
                            currency: pocket.currency,
                        })}
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
                            iconOnly: true,
                            variant: 'ghost' as const,
                        }] : []),
                        {
                            icon: Edit2,
                            onClick: () => onEdit(pocket),
                            label: 'Edit',
                            iconOnly: true,
                            variant: 'ghost' as const,
                        },
                        {
                            icon: Archive,
                            onClick: () => onArchive(pocket.id),
                            label: 'Archive',
                            iconOnly: true,
                            variant: 'ghost' as const,
                            loading: isArchiving,
                        }
                    ]}
                />
            </div>
        </div>
    );
};

export default memo(PocketCard);
