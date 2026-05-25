import { Archive, Edit2, Trash2, type LucideIcon } from 'lucide-react';
import Button from './Button';

interface Action {
    icon: LucideIcon;
    label?: string;
    /**
     * When true the button renders as icon-only — the visible text label
     * is suppressed but the `label` is still wired through to `title` and
     * `aria-label` so the action remains discoverable to screen readers
     * and tooltips on hover. Use this for compact card surfaces where the
     * icon alone provides enough context for sighted users.
     */
    iconOnly?: boolean;
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
            {actions.map((action, index) => {
                // For icon-only buttons, the underlying Button component
                // already prepends a spinner when `loading` is true. If we
                // still render the action icon next to it, the user sees
                // two glyphs (spinner + original icon) and the button
                // visibly grows during the in-flight state. Suppress the
                // action icon while loading to keep the spinner in its
                // place — the labelled variant keeps the action icon
                // because the trailing label provides the visual anchor.
                const showActionIcon = !(action.iconOnly && action.loading);
                return (
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
                        {showActionIcon && (
                            <action.icon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} aria-hidden="true" />
                        )}
                        {action.label && !action.iconOnly && <span className="ml-1">{action.label}</span>}
                    </Button>
                );
            })}
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

/**
 * Two-action variant for archive-aware surfaces (account cards, pocket
 * rows). Renders icon-only Edit and Archive buttons — labels are kept
 * for accessibility (`title` and `aria-label`) but the visible text is
 * suppressed so the card stays compact.
 *
 * Permanent delete is intentionally NOT rendered here. After a row is
 * archived it moves to the page-level "Archived" section, which is the
 * single entry point for permanent deletion. Keeping the destructive
 * option off the active card prevents accidental cascade deletes.
 */
export const EditArchiveActions = ({
    onEdit,
    onArchive,
    isArchiving = false,
    showOnHover = true,
}: {
    onEdit: () => void;
    onArchive: () => void;
    isArchiving?: boolean;
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
                    iconOnly: true,
                },
                {
                    icon: Archive,
                    onClick: onArchive,
                    variant: 'ghost',
                    loading: isArchiving,
                    label: 'Archive',
                    iconOnly: true,
                },
            ]}
        />
    );
};

export default ActionButtons;
