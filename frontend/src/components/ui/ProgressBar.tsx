import type { ReactNode } from 'react';

interface ProgressBarProps {
    value: number; // 0-100
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'danger';
    showLabel?: boolean;
    label?: ReactNode;
    className?: string;
}

const ProgressBar = ({
    value,
    max = 100,
    size = 'md',
    variant = 'default',
    showLabel = false,
    label,
    className = '',
}: ProgressBarProps) => {
    const percentage = Math.min((value / max) * 100, 100);

    const sizeStyles = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    };

    const getVariantColor = (): string => {
        if (variant !== 'default') {
            const colors = {
                success: 'bg-green-500 dark:bg-green-400',
                warning: 'bg-yellow-500 dark:bg-yellow-400',
                danger: 'bg-red-500 dark:bg-red-400',
            };
            return colors[variant];
        }

        // Auto color based on percentage
        if (percentage === 0) return 'bg-red-500 dark:bg-red-400';
        if (percentage < 50) return 'bg-orange-500 dark:bg-orange-400';
        if (percentage < 100) return 'bg-yellow-500 dark:bg-yellow-400';
        return 'bg-green-500 dark:bg-green-400';
    };

    return (
        <div className={className}>
            {(showLabel || label) && (
                <div className="flex items-center justify-between mb-1">
                    {label && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {label}
                        </span>
                    )}
                    {showLabel && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {percentage.toFixed(0)}%
                        </span>
                    )}
                </div>
            )}
            <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeStyles[size]}`}>
                <div
                    className={`${sizeStyles[size]} ${getVariantColor()} transition-all duration-300 ease-out rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
