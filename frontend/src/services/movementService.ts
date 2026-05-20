import type { Movement, MovementType } from '../types';
import { apiClient } from './apiClient';
import { parseDate } from '../utils/dateUtils';

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

class MovementService {
  // --- API-backed methods ---

  async getAllMovements(page?: number, limit?: number): Promise<Movement[]> {
    const params = new URLSearchParams();
    if (page !== undefined) params.set('page', String(page));
    if (limit !== undefined) params.set('limit', String(limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiClient.get<Movement[]>(`/api/movements${query}`);
  }

  async getActiveMovements(): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.filter(m => !m.isOrphaned);
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
}

export const movementService = new MovementService();
