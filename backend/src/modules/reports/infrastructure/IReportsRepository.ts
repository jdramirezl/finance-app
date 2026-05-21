export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface SpendingByCategoryRow {
  category: string;
  totals: CurrencyAmount[];
  count: number;
}

export interface MonthlyTrendRow {
  month: string; // 'YYYY-MM'
  income: CurrencyAmount[];
  expenses: CurrencyAmount[];
}

export interface CategoryTrendRow {
  month: string; // 'YYYY-MM'
  totals: CurrencyAmount[];
  count: number;
}

export interface ExchangeRateHistoryRow {
  date: string; // 'YYYY-MM-DD'
  rate: number;
}

export interface IReportsRepository {
  /**
   * Aggregate expenses by category within a date range, grouped by currency.
   * Only counts expense types, excludes pending/orphaned.
   */
  aggregateByCategory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SpendingByCategoryRow[]>;

  /**
   * Aggregate income and expenses by month for the last N months, grouped by currency.
   * Excludes pending/orphaned.
   */
  aggregateMonthly(
    userId: string,
    months: number
  ): Promise<MonthlyTrendRow[]>;

  /**
   * Aggregate expenses for a specific category by month for the last N months, grouped by currency.
   * Excludes pending/orphaned.
   */
  aggregateByCategoryMonthly(
    userId: string,
    category: string,
    months: number
  ): Promise<CategoryTrendRow[]>;

  /**
   * Get historical exchange rates for a currency pair, grouped by day (latest per day).
   */
  getExchangeRateHistory(
    baseCurrency: string,
    targetCurrency: string,
    days: number
  ): Promise<ExchangeRateHistoryRow[]>;
}
