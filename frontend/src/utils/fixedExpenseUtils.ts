/**
 * Calculate the monthly contribution for a fixed expense
 * @param valueTotal - Total value to save/pay
 * @param periodicityMonths - Number of months to divide over
 * @returns Monthly contribution amount
 */
export const calculateAporteMensual = (valueTotal: number, periodicityMonths: number): number => {
    if (periodicityMonths <= 0) return 0;
    return valueTotal / periodicityMonths;
};

/**
 * Calculate the progress percentage for a fixed expense
 * @param balance - Current balance
 * @param valueTotal - Total target value
 * @returns Progress percentage (0-100)
 */
export const calculateProgress = (balance: number, valueTotal: number): number => {
    if (valueTotal <= 0) return 0;
    return Math.min((balance / valueTotal) * 100, 100);
};

/**
 * Get the appropriate color for a progress bar based on percentage
 * @param progress - Progress percentage (0-100)
 * @returns Tailwind CSS color class
 */
export const getProgressColor = (progress: number): string => {
    if (progress === 0) return 'bg-red-500';
    if (progress < 50) return 'bg-orange-500';
    if (progress < 100) return 'bg-yellow-500';
    return 'bg-green-500';
};
