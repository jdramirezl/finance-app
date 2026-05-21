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
                    <h1 className="text-2xl font-semibold font-display text-on-surface tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-on-surface-variant mt-2">
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
