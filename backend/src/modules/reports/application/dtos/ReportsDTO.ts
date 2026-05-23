import type { CurrencyAmount } from '../../infrastructure/IReportsRepository';

export interface CategorySpending {
  category: string;
  totals: CurrencyAmount[];
  count: number;
  percentage: number;
}

export interface SpendingByCategoryDTO {
  data: CategorySpending[];
  totalExpenses: CurrencyAmount[];
}

export interface MonthlyTrendItem {
  month: string; // 'YYYY-MM'
  income: CurrencyAmount[];
  expenses: CurrencyAmount[];
}

export interface MonthlyTrendDTO {
  data: MonthlyTrendItem[];
}

export interface CategoryTrendItem {
  month: string; // 'YYYY-MM'
  totals: CurrencyAmount[];
  count: number;
}

export interface CategoryTrendDTO {
  data: CategoryTrendItem[];
  category: string;
}
