import { memo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { getMovementTypeColor, getMovementTypeLabel } from '../../utils/movementTypes';
import type { Account, MovementTemplate, Pocket } from '../../types';

interface TemplateCardProps {
    template: MovementTemplate;
    account?: Account;
    pocket?: Pocket;
    isDeleting: boolean;
    disableActions: boolean;
    onEdit: (template: MovementTemplate) => void;
    onDelete: (template: MovementTemplate) => void;
}

/**
 * Renders a single movement template card with edit/delete actions.
 * Wrapped in React.memo so updating one template doesn't re-render the entire list.
 */
const TemplateCard = ({
    template,
    account,
    pocket,
    isDeleting,
    disableActions,
    onEdit,
    onDelete,
}: TemplateCardProps) => {
    return (
        <Card>
            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {template.name}
                        </h3>
                        <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded mt-1 ${getMovementTypeColor(template.type)}`}
                        >
                            {getMovementTypeLabel(template.type)}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(template)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            aria-label={`Edit template ${template.name}`}
                            title={`Edit template ${template.name}`}
                        >
                            <Edit2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(template)}
                            loading={isDeleting}
                            disabled={disableActions}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                            aria-label={`Delete template ${template.name}`}
                            title={`Delete template ${template.name}`}
                        >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Account:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                            {account?.name || 'Unknown'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Pocket:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                            {pocket?.name || 'Unknown'}
                        </span>
                    </div>
                    {template.defaultAmount && (
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                                ${template.defaultAmount.toFixed(2)}
                            </span>
                        </div>
                    )}
                    {template.notes && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-gray-600 dark:text-gray-400 text-xs italic">
                                "{template.notes}"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default memo(TemplateCard);
