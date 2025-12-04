interface DonutChartProps {
    entries: Array<{ name: string; percentage: number; color: string }>;
    size?: number;
    strokeWidth?: number;
}

const DonutChart = ({ entries, size = 200, strokeWidth = 30 }: DonutChartProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let currentOffset = 0;
    const totalPercentage = entries.reduce((sum, e) => sum + e.percentage, 0);

    return (
        <div className="relative inline-block">
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-gray-200 dark:text-gray-700"
                />

                {/* Segments */}
                {entries.map((entry, index) => {
                    const segmentLength = (entry.percentage / 100) * circumference;
                    const segment = (
                        <circle
                            key={index}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={entry.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${segmentLength} ${circumference}`}
                            strokeDashoffset={-currentOffset}
                            className="transition-all duration-500 hover:opacity-80"
                            strokeLinecap="round"
                        />
                    );
                    currentOffset += segmentLength;
                    return segment;
                })}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {totalPercentage.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    Allocated
                </div>
            </div>
        </div>
    );
};

export default DonutChart;
