import type { Movement, MovementType } from '../types';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import { mapMovementRow } from './mappers';
import { parseDate } from '../utils/dateUtils';

export interface CurrencyTotal {
  currency: string;
  amount: number;
}

export interface PeriodSummary {
  totals: CurrencyTotal[];
}

export interface SpendingSummaryResponse {
  today: PeriodSummary;
  thisWeek: PeriodSummary;
  lastWeek: PeriodSummary;
  thisMonth: PeriodSummary;
  lastMonth: PeriodSummary;
}

/**
 * Generic paginated response shape returned by the backend's list endpoints.
 *
 * `hasMore` is the canonical signal for "another page exists" — callers
 * should prefer it over comparing `data.length === limit`, which breaks
 * when `total % limit === 0`.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Default page size used when callers ask for "everything" without
// specifying pagination. The backend now paginates the movements list,
// so we send a high limit to preserve legacy callers (export, calendar
// data, etc.) until they migrate to proper pagination.
//
// TODO: remove this once every caller of `getAllMovements()` either
// supplies its own pagination or switches to an infinite query.
const LEGACY_FULL_FETCH_LIMIT = 1000;

class MovementService {
  // --- API-backed methods ---

  /**
   * Fetch movements as a flat array.
   *
   * The backend's `GET /api/movements` endpoint now returns a paginated
   * envelope (`{ data, total, page, limit, hasMore }`). This method
   * unwraps it and returns just `data` so existing callers that expect
   * a `Movement[]` keep working.
   *
   * - With no arguments: fetches a single page using a high limit
   *   (`LEGACY_FULL_FETCH_LIMIT`) so legacy "give me everything" callers
   *   still get a representative result without changing their code.
   * - With explicit `page`/`limit`: forwards those values verbatim.
   *
   * For new code that needs pagination metadata, prefer
   * {@link MovementService.getAllMovementsPaginated}.
   */
  async getAllMovements(page?: number, limit?: number): Promise<Movement[]> {
    const effectivePage = page ?? 1;
    const effectiveLimit = limit ?? LEGACY_FULL_FETCH_LIMIT;
    const response = await this.getAllMovementsPaginated(effectivePage, effectiveLimit);
    return response.data;
  }

  /**
   * Fetch a page of movements along with pagination metadata.
   *
   * Use this for infinite scroll, "Load More" buttons, or anything else
   * that needs to know whether more pages exist (`hasMore`) or display
   * a total count (`total`).
   */
  async getAllMovementsPaginated(
    page: number,
    limit: number,
    filters?: { category?: string; tags?: string[] },
  ): Promise<PaginatedResponse<Movement>> {
    const offset = (page - 1) * limit;
    let query = supabase
      .from('movements')
      .select('*', { count: 'exact' })
      .order('displayed_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.tags?.length) query = query.overlaps('tags', filters.tags);
    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      data: (data ?? []).map(mapMovementRow),
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Fetch all non-orphaned movements.
   *
   * Used by hooks that need the full active-movements set (calendar
   * widget, auto-snapshot, mark-as-paid modal). Internally this hits
   * the paginated endpoint with `LEGACY_FULL_FETCH_LIMIT` — a temporary
   * measure until those consumers migrate to proper pagination or
   * server-side filtering.
   */
  async getActiveMovements(): Promise<Movement[]> {
    const response = await this.getAllMovementsPaginated(1, LEGACY_FULL_FETCH_LIMIT);
    return response.data.filter(m => !m.isOrphaned);
  }

  async getOrphanedMovements(): Promise<Movement[]> {
    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('is_orphaned', true)
      .order('displayed_date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMovementRow);
  }

  async getMovementsByAccount(accountId: string, page?: number, limit?: number): Promise<Movement[]> {
    let query = supabase
      .from('movements')
      .select('*')
      .eq('account_id', accountId)
      .order('displayed_date', { ascending: false });
    if (page !== undefined && limit !== undefined) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMovementRow);
  }

  async getMovementsByPocket(pocketId: string, page?: number, limit?: number): Promise<Movement[]> {
    let query = supabase
      .from('movements')
      .select('*')
      .eq('pocket_id', pocketId)
      .order('displayed_date', { ascending: false });
    if (page !== undefined && limit !== undefined) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMovementRow);
  }

  async getMovementYears(): Promise<{ years: { year: number; count: number; months: number[] }[] }> {
    const { data, error } = await supabase
      .from('movements')
      .select('displayed_date')
      .eq('is_orphaned', false);
    if (error) throw new Error(error.message);
    const yearMap = new Map<number, { count: number; months: Set<number> }>();
    for (const row of data ?? []) {
      const d = new Date(row.displayed_date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const entry = yearMap.get(y) || { count: 0, months: new Set<number>() };
      entry.count++;
      entry.months.add(m);
      yearMap.set(y, entry);
    }
    const years = Array.from(yearMap.entries())
      .map(([year, { count, months }]) => ({
        year,
        count,
        months: [...months].sort((a, b) => a - b),
      }))
      .sort((a, b) => b.year - a.year);
    return { years };
  }

  async getMovementsByMonth(
    year: number,
    month: number,
    page = 1,
    limit = 50,
    filters?: { category?: string; tags?: string[] },
  ): Promise<PaginatedResponse<Movement>> {
    const offset = (page - 1) * limit;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate =
      new Date(year, month, 0).toISOString().split('T')[0] + 'T23:59:59.999Z';
    let query = supabase
      .from('movements')
      .select('*', { count: 'exact' })
      .gte('displayed_date', startDate)
      .lte('displayed_date', endDate)
      .order('displayed_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.tags?.length) query = query.overlaps('tags', filters.tags);
    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      data: (data ?? []).map(mapMovementRow),
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    };
  }

  async getMovementsGroupedByMonth(): Promise<Map<string, Movement[]>> {
    const movements = await this.getActiveMovements();
    const grouped = new Map<string, Movement[]>();
    for (const m of movements) {
      const date = parseDate(m.displayedDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }
    return grouped;
  }

  async createMovement(
    type: MovementType,
    accountId: string,
    pocketId: string,
    amount: number,
    notes?: string,
    displayedDate?: string,
    subPocketId?: string,
    isPending?: boolean,
    category?: string,
    tags?: string[]
  ): Promise<Movement> {
    return await apiClient.post<Movement>('/api/movements', {
      type, accountId, pocketId, amount, notes, displayedDate, subPocketId, isPending,
      category, tags,
    });
  }

  async createTransfer(
    sourceAccountId: string,
    sourcePocketId: string,
    targetAccountId: string,
    targetPocketId: string,
    amount: number,
    displayedDate: string,
    notes?: string
  ): Promise<{ expense: Movement; income: Movement }> {
    const result = await apiClient.post<{
      expense: Record<string, unknown>;
      income: Record<string, unknown>;
    }>('/api/movements/transfer', {
      sourceAccountId,
      sourcePocketId,
      targetAccountId,
      targetPocketId,
      amount,
      displayedDate,
      notes,
    });

    return {
      expense: mapMovementRow(result.expense),
      income: mapMovementRow(result.income),
    };
  }

  async updateMovement(
    id: string,
    updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate' | 'category' | 'tags' | 'isPending'>>
  ): Promise<Movement> {
    return await apiClient.put<Movement>(`/api/movements/${id}`, updates);
  }

  async deleteMovement(id: string): Promise<void> {
    await apiClient.delete(`/api/movements/${id}`);
  }

  async getPendingMovements(): Promise<Movement[]> {
    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('is_pending', true)
      .order('displayed_date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMovementRow);
  }

  async applyPendingMovement(id: string): Promise<Movement> {
    return await apiClient.post<Movement>(`/api/movements/${id}/apply`, {});
  }

  async markAsPending(id: string): Promise<Movement> {
    return await apiClient.post<Movement>(`/api/movements/${id}/mark-pending`, {});
  }

  async restoreOrphanedMovements(
    movementIds: string[],
    accountId: string,
    pocketId: string
  ): Promise<{ restored: number; failed: number }> {
    return await apiClient.post('/api/movements/restore-orphaned', { movementIds, accountId, pocketId });
  }

  // --- Bulk operations (delegated to backend) ---

  async batchCreateMovements(movements: Array<{
    type: MovementType;
    accountId: string;
    pocketId: string;
    subPocketId?: string;
    amount: number;
    notes?: string;
    displayedDate: string;
    isPending?: boolean;
    category?: string;
    tags?: string[];
  }>): Promise<Movement[]> {
    return await apiClient.post<Movement[]>('/api/movements/batch', { movements });
  }

  async deleteMovementsByAccount(accountId: string): Promise<number> {
    const result = await apiClient.delete<{ count: number }>(
      `/api/movements/by-account/${accountId}`
    );
    return result.count;
  }

  async deleteMovementsByPocket(pocketId: string): Promise<number> {
    const result = await apiClient.delete<{ count: number }>(
      `/api/movements/by-pocket/${pocketId}`
    );
    return result.count;
  }

  async markMovementsAsOrphaned(
    id: string,
    type: 'account' | 'pocket'
  ): Promise<number> {
    const result = await apiClient.post<{ count: number }>(
      '/api/movements/mark-orphaned',
      { entityId: id, entityType: type }
    );
    return result.count;
  }

  async updateMovementsAccountForPocket(
    pocketId: string,
    newAccountId: string
  ): Promise<number> {
    const result = await apiClient.post<{ count: number }>(
      '/api/movements/update-account',
      { pocketId, newAccountId }
    );
    return result.count;
  }

  async getSpendingSummary(): Promise<SpendingSummaryResponse> {
    return apiClient.get<SpendingSummaryResponse>('/api/movements/spending-summary');
  }
}

export const movementService = new MovementService();
