import { apiClient } from './apiClient';

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface CategorySpending {
  category: string;
  totals: CurrencyAmount[];
  count: number;
  percentage: number;
}

export interface SpendingByCategoryResponse {
  data: CategorySpending[];
  totalExpenses: CurrencyAmount[];
}

export interface MonthlyTrendEntry {
  month: string;
  income: CurrencyAmount[];
  expenses: CurrencyAmount[];
}

export interface MonthlyTrendResponse {
  data: MonthlyTrendEntry[];
}

export interface CategoryTrendEntry {
  month: string;
  totals: CurrencyAmount[];
  count: number;
}

export interface CategoryTrendResponse {
  data: CategoryTrendEntry[];
  category: string;
}

export interface ExchangeRateHistoryEntry {
  date: string;
  rate: number;
}

export interface ExchangeRateHistoryResponse {
  data: ExchangeRateHistoryEntry[];
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

  getExchangeRateHistory(base: string, target: string, days: number = 90): Promise<ExchangeRateHistoryResponse> {
    return apiClient.get(`/api/reports/exchange-rate-history?base=${base}&target=${target}&days=${days}`);
  },
};
