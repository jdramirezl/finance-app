export interface SpendingByCategoryRow {
  category: string;
  total: number;
  count: number;
}

export interface MonthlyTrendRow {
  month: string; // 'YYYY-MM'
  income: number;
  expenses: number;
}

export interface CategoryTrendRow {
  month: string; // 'YYYY-MM'
  total: number;
  count: number;
}

export interface IReportsRepository {
  /**
   * Aggregate expenses by category within a date range.
   * Only counts expense types, excludes pending/orphaned.
   */
  aggregateByCategory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SpendingByCategoryRow[]>;

  /**
   * Aggregate income and expenses by month for the last N months.
   * Excludes pending/orphaned.
   */
  aggregateMonthly(
    userId: string,
    months: number
  ): Promise<MonthlyTrendRow[]>;

  /**
   * Aggregate expenses for a specific category by month for the last N months.
   * Excludes pending/orphaned.
   */
  aggregateByCategoryMonthly(
    userId: string,
    category: string,
    months: number
  ): Promise<CategoryTrendRow[]>;
}
