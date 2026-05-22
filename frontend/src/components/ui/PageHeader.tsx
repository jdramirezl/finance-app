import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    stats?: ReactNode;
}

const PageHeader = ({ title, description, actions, stats }: PageHeaderProps) => {
    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {description}
                        </p>
                    )}
                </div>
                {actions && <div className="flex-shrink-0">{actions}</div>}
            </div>
            {stats && <div>{stats}</div>}
        </div>
    );
};

export default PageHeader;
