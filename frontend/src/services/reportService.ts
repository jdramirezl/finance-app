import { apiClient } from './apiClient';

export interface CategorySpending {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface SpendingByCategoryResponse {
  data: CategorySpending[];
  totalExpenses: number;
  currency: string;
}

export interface MonthlyTrendEntry {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface MonthlyTrendResponse {
  data: MonthlyTrendEntry[];
  currency: string;
}

export interface CategoryTrendEntry {
  month: string;
  total: number;
  count: number;
}

export interface CategoryTrendResponse {
  data: CategoryTrendEntry[];
  category: string;
  currency: string;
}

export const reportService = {
  getSpendingByCategory(startDate: string, endDate: string): Promise<SpendingByCategoryResponse> {
    return apiClient.get(`/api/reports/spending-by-category?startDate=${startDate}&endDate=${endDate}`);
  },

  getMonthlyTrend(months: number = 6): Promise<MonthlyTrendResponse> {
    return apiClient.get(`/api/reports/monthly-trend?months=${months}`);
  },

  getCategoryTrend(category: string, months: number = 6): Promise<CategoryTrendResponse> {
    return apiClient.get(`/api/reports/category-trend?category=${encodeURIComponent(category)}&months=${months}`);
  },
};
