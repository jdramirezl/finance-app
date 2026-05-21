import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import type { IReportsRepository, SpendingByCategoryRow, MonthlyTrendRow, CategoryTrendRow } from './IReportsRepository';
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
      .select('category, amount')
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

    const map = new Map<string, { total: number; count: number }>();
    for (const row of data) {
      const cat = row.category || 'Other';
      const entry = map.get(cat) || { total: 0, count: 0 };
      entry.total += row.amount;
      entry.count += 1;
      map.set(cat, entry);
    }

    return Array.from(map.entries()).map(([category, { total, count }]) => ({
      category,
      total,
      count,
    }));
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
      .select('type, amount, displayed_date')
      .eq('user_id', userId)
      .eq('is_pending', false)
      .eq('is_orphaned', false)
      .gte('displayed_date', startDate.toISOString());

    if (error) {
      throw new DatabaseError(`Failed to aggregate monthly: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    const map = new Map<string, { income: number; expenses: number }>();
    for (const row of data) {
      const date = new Date(row.displayed_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key) || { income: 0, expenses: 0 };
      if (row.type === 'IngresoNormal' || row.type === 'IngresoFijo') {
        entry.income += row.amount;
      } else {
        entry.expenses += row.amount;
      }
      map.set(key, entry);
    }

    return Array.from(map.entries())
      .map(([month, { income, expenses }]) => ({ month, income, expenses }))
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
      .select('amount, displayed_date')
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

    const map = new Map<string, { total: number; count: number }>();
    for (const row of data) {
      const date = new Date(row.displayed_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key) || { total: 0, count: 0 };
      entry.total += row.amount;
      entry.count += 1;
      map.set(key, entry);
    }

    return Array.from(map.entries())
      .map(([month, { total, count }]) => ({ month, total, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
