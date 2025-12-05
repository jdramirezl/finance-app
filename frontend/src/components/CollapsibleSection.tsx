import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    count?: number;
    isExpanded: boolean;
    onToggle: () => void;
    children: ReactNode;
    summary?: ReactNode;
    className?: string;
}

const CollapsibleSection = ({
    title,
    count,
    isExpanded,
    onToggle,
    children,
    summary,
    className = '',
}: CollapsibleSectionProps) => {
    return (
        <div className={`space-y-2 ${className}`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border border-gray-200 dark:border-gray-700"
            >
                <div className="flex items-center gap-4">
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                    </h3>
                    {count !== undefined && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                            {count}
                        </span>
                    )}
                </div>
                {summary && (
                    <div className="flex items-center gap-4 text-sm">
                        {summary}
                    </div>
                )}
            </button>

            {isExpanded && (
                <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-4">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;
