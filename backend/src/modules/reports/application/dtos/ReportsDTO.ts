export interface CategorySpending {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface SpendingByCategoryDTO {
  data: CategorySpending[];
  totalExpenses: number;
  currency: string;
}

export interface MonthlyTrendItem {
  month: string; // 'YYYY-MM'
  income: number;
  expenses: number;
  net: number;
}

export interface MonthlyTrendDTO {
  data: MonthlyTrendItem[];
  currency: string;
}

export interface CategoryTrendItem {
  month: string; // 'YYYY-MM'
  total: number;
  count: number;
}

export interface CategoryTrendDTO {
  data: CategoryTrendItem[];
  category: string;
  currency: string;
}
