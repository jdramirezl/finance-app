/**
 * Spending Summary DTOs
 */

export interface CurrencyTotal {
  currency: string;
  amount: number;
}

export interface PeriodSummary {
  totals: CurrencyTotal[];
}

export interface SpendingSummaryDTO {
  today: PeriodSummary;
  thisWeek: PeriodSummary;
  lastWeek: PeriodSummary;
  thisMonth: PeriodSummary;
  lastMonth: PeriodSummary;
}
