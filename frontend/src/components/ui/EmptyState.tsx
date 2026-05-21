import type { LucideIcon } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    className?: string;
}

const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) => {
    return (
        <Card className={className}>
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                    <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {description}
                </p>
                {action && (
                    <Button variant="primary" onClick={action.onClick}>
                        {action.icon && <action.icon className="w-5 h-5" />}
                        {action.label}
                    </Button>
                )}
            </div>
        </Card>
    );
};

export default EmptyState;
