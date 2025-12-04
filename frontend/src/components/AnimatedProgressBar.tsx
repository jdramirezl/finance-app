interface AnimatedProgressBarProps {
    value: number;
    max: number;
    label?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    showPercentage?: boolean;
    height?: 'sm' | 'md' | 'lg';
}

const AnimatedProgressBar = ({
    value,
    max,
    label,
    color = 'blue',
    showPercentage = true,
    height = 'md'
}: AnimatedProgressBarProps) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-emerald-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600',
        red: 'from-red-500 to-red-600',
    };

    const heightClasses = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
    };

    return (
        <div className="w-full">
            {(label || showPercentage) && (
                <div className="flex justify-between items-center mb-1.5">
                    {label && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {label}
                        </span>
                    )}
                    {showPercentage && (
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {percentage.toFixed(0)}%
                        </span>
                    )}
                </div>
            )}
            <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClasses[height]}`}>
                <div
                    className={`${heightClasses[height]} bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all duration-1000 ease-out shadow-sm relative overflow-hidden`}
                    style={{ width: `${percentage}%` }}
                >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                        style={{
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 2s infinite'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default AnimatedProgressBar;
