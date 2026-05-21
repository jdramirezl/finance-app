import type { Movement, MovementType } from '../types';
import { apiClient } from './apiClient';
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

// Helper to map snake_case DB rows to camelCase Movement objects
function mapMovementRow(row: Record<string, unknown>): Movement {
  return {
    id: row.id as string,
    type: row.type as MovementType,
    accountId: (row.account_id || row.accountId) as string,
    pocketId: (row.pocket_id || row.pocketId) as string,
    subPocketId: (row.sub_pocket_id || row.subPocketId) as string | undefined,
    amount: Number(row.amount),
    notes: (row.notes as string) || undefined,
    displayedDate: (row.displayed_date || row.displayedDate) as string,
    createdAt: (row.created_at || row.createdAt) as string,
    isPending: Boolean(row.is_pending ?? row.isPending),
    isOrphaned: Boolean(row.is_orphaned ?? row.isOrphaned),
    orphanedAccountName: (row.orphaned_account_name || row.orphanedAccountName) as string | undefined,
    orphanedAccountCurrency: (row.orphaned_account_currency || row.orphanedAccountCurrency) as string | undefined,
    orphanedPocketName: (row.orphaned_pocket_name || row.orphanedPocketName) as string | undefined,
  };
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
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filters?.category) params.set('category', filters.category);
    if (filters?.tags?.length) params.set('tags', filters.tags.join(','));
    return await apiClient.get<PaginatedResponse<Movement>>(`/api/movements?${params.toString()}`);
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
    return await apiClient.get<Movement[]>('/api/movements/orphaned');
  }

  async getMovementsByAccount(accountId: string, page?: number, limit?: number): Promise<Movement[]> {
    const params = new URLSearchParams({ accountId });
    if (page !== undefined) params.set('page', String(page));
    if (limit !== undefined) params.set('limit', String(limit));
    return await apiClient.get<Movement[]>(`/api/movements?${params.toString()}`);
  }

  async getMovementsByPocket(pocketId: string, page?: number, limit?: number): Promise<Movement[]> {
    const params = new URLSearchParams({ pocketId });
    if (page !== undefined) params.set('page', String(page));
    if (limit !== undefined) params.set('limit', String(limit));
    return await apiClient.get<Movement[]>(`/api/movements?${params.toString()}`);
  }

  async getMovementsByMonth(year: number, month: number): Promise<Movement[]> {
    return await apiClient.get<Movement[]>(`/api/movements?year=${year}&month=${month}`);
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
    isPending?: boolean
  ): Promise<Movement> {
    return await apiClient.post<Movement>('/api/movements', {
      type, accountId, pocketId, amount, notes, displayedDate, subPocketId, isPending,
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
    updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>
  ): Promise<Movement> {
    return await apiClient.put<Movement>(`/api/movements/${id}`, updates);
  }

  async deleteMovement(id: string): Promise<void> {
    await apiClient.delete(`/api/movements/${id}`);
  }

  async getPendingMovements(): Promise<Movement[]> {
    return await apiClient.get<Movement[]>('/api/movements/pending');
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
