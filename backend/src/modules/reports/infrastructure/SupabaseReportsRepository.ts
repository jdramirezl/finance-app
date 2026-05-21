import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import type { IReportsRepository, SpendingByCategoryRow, MonthlyTrendRow, CategoryTrendRow, CurrencyAmount } from './IReportsRepository';
import { DatabaseError } from '../../../shared/errors/AppError';

@injectable()
export class SupabaseReportsRepository implements IReportsRepository {
  constructor(@inject('SupabaseClient') private supabase: SupabaseClient) {}

  async aggregateByCategory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SpendingByCategoryRow[]> {
    const { data, error } = await this.supabase
      .from('movements')
      .select('category, amount, accounts!inner(currency)')
      .eq('user_id', userId)
      .in('type', ['EgresoNormal', 'EgresoFijo'])
      .eq('is_pending', false)
      .eq('is_orphaned', false)
      .gte('displayed_date', startDate.toISOString())
      .lte('displayed_date', endDate.toISOString());

    if (error) {
      throw new DatabaseError(`Failed to aggregate by category: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    // Group by (category, currency)
    const map = new Map<string, Map<string, { amount: number; count: number }>>();
    for (const row of data) {
      const cat = row.category || 'Other';
      const currency = (row as any).accounts?.currency as string;
      if (!currency) continue;

      if (!map.has(cat)) map.set(cat, new Map());
      const currMap = map.get(cat)!;
      const entry = currMap.get(currency) || { amount: 0, count: 0 };
      entry.amount += row.amount;
      entry.count += 1;
      currMap.set(currency, entry);
    }

    return Array.from(map.entries()).map(([category, currMap]) => {
      const totals: CurrencyAmount[] = [];
      let count = 0;
      for (const [currency, { amount, count: c }] of currMap) {
        totals.push({ currency, amount });
        count += c;
      }
      return { category, totals, count };
    });
  }

  async aggregateMonthly(
    userId: string,
    months: number
  ): Promise<MonthlyTrendRow[]> {
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('movements')
      .select('type, amount, displayed_date, accounts!inner(currency)')
      .eq('user_id', userId)
      .eq('is_pending', false)
      .eq('is_orphaned', false)
      .gte('displayed_date', startDate.toISOString());

    if (error) {
      throw new DatabaseError(`Failed to aggregate monthly: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    // Group by (month, type, currency)
    const map = new Map<string, { income: Map<string, number>; expenses: Map<string, number> }>();
    for (const row of data) {
      const currency = (row as any).accounts?.currency as string;
      if (!currency) continue;

      const date = new Date(row.displayed_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { income: new Map(), expenses: new Map() });
      const entry = map.get(key)!;

      if (row.type === 'IngresoNormal' || row.type === 'IngresoFijo') {
        entry.income.set(currency, (entry.income.get(currency) || 0) + row.amount);
      } else {
        entry.expenses.set(currency, (entry.expenses.get(currency) || 0) + row.amount);
      }
    }

    return Array.from(map.entries())
      .map(([month, { income, expenses }]) => ({
        month,
        income: Array.from(income.entries()).map(([currency, amount]) => ({ currency, amount })),
        expenses: Array.from(expenses.entries()).map(([currency, amount]) => ({ currency, amount })),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async aggregateByCategoryMonthly(
    userId: string,
    category: string,
    months: number
  ): Promise<CategoryTrendRow[]> {
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('movements')
      .select('amount, displayed_date, accounts!inner(currency)')
      .eq('user_id', userId)
      .eq('category', category)
      .in('type', ['EgresoNormal', 'EgresoFijo'])
      .eq('is_pending', false)
      .eq('is_orphaned', false)
      .gte('displayed_date', startDate.toISOString());

    if (error) {
      throw new DatabaseError(`Failed to aggregate category monthly: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    // Group by (month, currency)
    const map = new Map<string, { totals: Map<string, number>; count: number }>();
    for (const row of data) {
      const currency = (row as any).accounts?.currency as string;
      if (!currency) continue;

      const date = new Date(row.displayed_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { totals: new Map(), count: 0 });
      const entry = map.get(key)!;
      entry.totals.set(currency, (entry.totals.get(currency) || 0) + row.amount);
      entry.count += 1;
    }

    return Array.from(map.entries())
      .map(([month, { totals, count }]) => ({
        month,
        totals: Array.from(totals.entries()).map(([currency, amount]) => ({ currency, amount })),
        count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
