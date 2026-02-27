/**
 * Format a number as currency with the appropriate symbol and formatting
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    MXN: '$',
    COP: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency] || currency;
  
  // Format with 2 decimal places and thousands separator
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Add negative sign if needed
  const sign = amount < 0 ? '-' : '';
  
  return `${sign}${symbol}${formatted}`;
}
