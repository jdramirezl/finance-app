import { Edit2, Trash2, type LucideIcon } from 'lucide-react';
import Button from './Button';

interface Action {
    icon: LucideIcon;
    label?: string;
    onClick: () => void;
    variant?: 'ghost' | 'primary' | 'secondary' | 'danger';
    loading?: boolean;
    disabled?: boolean;
}

interface ActionButtonsProps {
    actions: Action[];
    size?: 'sm' | 'md';
    showOnHover?: boolean;
    className?: string;
}

/**
 * ActionButtons component for consistent action button patterns.
 *
 * `showOnHover` keeps the actions discoverable but visually subtler when the
 * user is not hovering the parent group. We deliberately avoid hiding the
 * actions completely (`opacity-0`) because that makes them unreachable for
 * keyboard users and invisible on touch devices.
 */
const ActionButtons = ({
    actions,
    size = 'sm',
    showOnHover = false,
    className = '',
}: ActionButtonsProps) => {
    const containerClass = showOnHover
        ? 'opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity'
        : '';

    return (
        <div className={`flex gap-2 ${containerClass} ${className}`}>
            {actions.map((action, index) => (
                <Button
                    key={index}
                    variant={action.variant || 'ghost'}
                    size={size}
                    onClick={action.onClick}
                    loading={action.loading}
                    disabled={action.disabled}
                    title={action.label}
                    aria-label={action.label}
                >
                    <action.icon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} aria-hidden="true" />
                    {action.label && <span className="ml-1">{action.label}</span>}
                </Button>
            ))}
        </div>
    );
};

// Convenience exports for common action patterns
export const EditDeleteActions = ({
    onEdit,
    onDelete,
    isDeleting = false,
    showOnHover = true,
}: {
    onEdit: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
    showOnHover?: boolean;
}) => {
    return (
        <ActionButtons
            showOnHover={showOnHover}
            actions={[
                {
                    icon: Edit2,
                    onClick: onEdit,
                    label: 'Edit',
                },
                {
                    icon: Trash2,
                    onClick: onDelete,
                    variant: 'ghost',
                    loading: isDeleting,
                    label: 'Delete',
                },
            ]}
        />
    );
};

export default ActionButtons;
