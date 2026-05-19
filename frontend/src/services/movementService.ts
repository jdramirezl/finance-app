import type { Movement, MovementType } from '../types';
import { SupabaseStorageService } from './supabaseStorageService';
import { generateId } from '../utils/idGenerator';
import { format } from 'date-fns';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';

// Lazy getters to avoid circular dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pocketServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let subPocketServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let accountServiceCache: any = null;

const getPocketService = async () => {
  if (!pocketServiceCache) {
    const module = await import('./pocketService');
    pocketServiceCache = module.pocketService;
  }
  return pocketServiceCache;
};

const getSubPocketService = async () => {
  if (!subPocketServiceCache) {
    const module = await import('./subPocketService');
    subPocketServiceCache = module.subPocketService;
  }
  return subPocketServiceCache;
};

const getAccountService = async () => {
  if (!accountServiceCache) {
    const module = await import('./accountService');
    accountServiceCache = module.accountService;
  }
  return accountServiceCache;
};

// Maps a raw movements row (snake_case columns from the DB) into the
// camelCase Movement type used throughout the frontend.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapMovementRow = (row: any): Movement => ({
  id: row.id,
  type: row.type,
  accountId: row.account_id,
  pocketId: row.pocket_id,
  subPocketId: row.sub_pocket_id ?? undefined,
  amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
  notes: row.notes ?? undefined,
  displayedDate: row.displayed_date,
  createdAt: row.created_at,
  isPending: row.is_pending ?? false,
  isOrphaned: row.is_orphaned ?? false,
  orphanedAccountName: row.orphaned_account_name ?? undefined,
  orphanedAccountCurrency: row.orphaned_account_currency ?? undefined,
  orphanedPocketName: row.orphaned_pocket_name ?? undefined,
});

class MovementService {
  // Feature flag to control backend usage
  private useBackend = import.meta.env.VITE_USE_BACKEND_MOVEMENTS === 'true';

  constructor() {
    // Log which mode we're in
    if (this.useBackend) {
      console.log('🚀 MovementService: Using BACKEND API at', import.meta.env.VITE_API_URL);
    } else {
      console.log('📦 MovementService: Using DIRECT Supabase calls');
    }
  }

  // Get all movements (including orphaned)
  async getAllMovements(page?: number, limit?: number): Promise<Movement[]> {
    return await this.getAllMovementsDirect(page, limit);
  }

  // Direct Supabase implementation (fallback)
  private async getAllMovementsDirect(page?: number, limit?: number): Promise<Movement[]> {
    const movements = await SupabaseStorageService.getMovements();
    if (page && limit) {
      const start = (page - 1) * limit;
      return movements.slice(start, start + limit);
    }
    return movements;
  }

  // Check if a movement is orphaned (account or pocket no longer exists)
  async isMovementOrphaned(movement: Movement): Promise<boolean> {
    const accountService = await getAccountService();
    const pocketService = await getPocketService();

    const account = await accountService.getAccount(movement.accountId);
    if (!account) return true;

    const pocket = await pocketService.getPocket(movement.pocketId);
    if (!pocket) return true;

    return false;
  }

  // Get all orphaned movements (INSTANT - just check flag)
  async getOrphanedMovements(): Promise<Movement[]> {
    if (this.useBackend) {
      try {
        return await apiClient.get<Movement[]>('/api/movements/orphaned');
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.getOrphanedMovementsDirect();
      }
    }
    return await this.getOrphanedMovementsDirect();
  }

  // Direct Supabase implementation (fallback)
  private async getOrphanedMovementsDirect(): Promise<Movement[]> {
    const movements = await this.getAllMovementsDirect();
    return movements.filter(m => m.isOrphaned === true);
  }

  // Get non-orphaned movements (active movements only) - INSTANT
  async getActiveMovements(): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.filter(m => !m.isOrphaned);
  }

  // Get movement by ID
  async getMovement(id: string): Promise<Movement | null> {
    const movements = await this.getAllMovements();
    return movements.find(m => m.id === id) || null;
  }

  // Get movements sorted by createdAt (registration date) - ACTIVE ONLY
  async getMovementsSortedByCreatedAt(): Promise<Movement[]> {
    const movements = await this.getActiveMovements(); // Filter orphaned
    return movements.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // Get movements by account - ACTIVE ONLY
  async getMovementsByAccount(accountId: string, page?: number, limit?: number): Promise<Movement[]> {
    if (this.useBackend) {
      try {
        let url = `/api/movements?accountId=${accountId}`;
        if (page && limit) {
          url += `&page=${page}&limit=${limit}`;
        }
        return await apiClient.get<Movement[]>(url);
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.getMovementsByAccountDirect(accountId, page, limit);
      }
    }
    return await this.getMovementsByAccountDirect(accountId, page, limit);
  }

  // Direct Supabase implementation (fallback)
  private async getMovementsByAccountDirect(accountId: string, page?: number, limit?: number): Promise<Movement[]> {
    const movements = await this.getActiveMovements(); // Filter orphaned
    const filtered = movements.filter(m => m.accountId === accountId);
    if (page && limit) {
      const start = (page - 1) * limit;
      return filtered.slice(start, start + limit);
    }
    return filtered;
  }

  // Get movements by pocket - ACTIVE ONLY
  async getMovementsByPocket(pocketId: string, page?: number, limit?: number): Promise<Movement[]> {
    if (this.useBackend) {
      try {
        let url = `/api/movements?pocketId=${pocketId}`;
        if (page && limit) {
          url += `&page=${page}&limit=${limit}`;
        }
        return await apiClient.get<Movement[]>(url);
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.getMovementsByPocketDirect(pocketId, page, limit);
      }
    }
    return await this.getMovementsByPocketDirect(pocketId, page, limit);
  }

  // Direct Supabase implementation (fallback)
  private async getMovementsByPocketDirect(pocketId: string, page?: number, limit?: number): Promise<Movement[]> {
    const movements = await this.getActiveMovements(); // Filter orphaned
    const filtered = movements.filter(m => m.pocketId === pocketId);
    if (page && limit) {
      const start = (page - 1) * limit;
      return filtered.slice(start, start + limit);
    }
    return filtered;
  }

  // Get movements grouped by month (based on displayedDate) - ACTIVE ONLY
  async getMovementsByMonth(year: number, month: number): Promise<Movement[]> {
    if (this.useBackend) {
      try {
        return await apiClient.get<Movement[]>(`/api/movements?year=${year}&month=${month}`);
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.getMovementsByMonthDirect(year, month);
      }
    }
    return await this.getMovementsByMonthDirect(year, month);
  }

  // Direct Supabase implementation (fallback)
  private async getMovementsByMonthDirect(year: number, month: number): Promise<Movement[]> {
    const movements = await this.getActiveMovements(); // Filter orphaned
    return movements.filter(m => {
      const date = new Date(m.displayedDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }

  // Get all movements grouped by month - ACTIVE ONLY
  async getMovementsGroupedByMonth(): Promise<Map<string, Movement[]>> {
    const movements = await this.getMovementsSortedByCreatedAt(); // Already filtered
    const grouped = new Map<string, Movement[]>();

    movements.forEach(movement => {
      const date = new Date(movement.displayedDate);
      const monthKey = format(date, 'yyyy-MM'); // e.g., "2025-01"

      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(movement);
    });

    return grouped;
  }

  // Get month keys with movement counts (for lazy loading) - ACTIVE ONLY
  async getMonthKeysWithCounts(): Promise<Map<string, number>> {
    const movements = await this.getActiveMovements();
    const counts = new Map<string, number>();

    movements.forEach(movement => {
      const date = new Date(movement.displayedDate);
      const monthKey = format(date, 'yyyy-MM');
      counts.set(monthKey, (counts.get(monthKey) || 0) + 1);
    });

    return counts;
  }

  // Get movements for a specific month with pagination - ACTIVE ONLY
  async getMovementsByMonthPaginated(
    monthKey: string,
    offset: number = 0,
    limit: number = 10
  ): Promise<Movement[]> {
    const movements = await this.getActiveMovements();

    // Filter by month
    const monthMovements = movements.filter(m => {
      const date = new Date(m.displayedDate);
      const key = format(date, 'yyyy-MM');
      return key === monthKey;
    });

    // Sort by createdAt (or could use displayedDate)
    monthMovements.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Return paginated slice
    return monthMovements.slice(offset, offset + limit);
  }

  // Balance updates are handled by database triggers (calculate_pocket_balance)
  // on every movement INSERT/UPDATE/DELETE. No manual balance manipulation needed.


  // Create new movement
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
    if (this.useBackend) {
      try {
        return await apiClient.post<Movement>('/api/movements', {
          type,
          accountId,
          pocketId,
          amount,
          notes,
          displayedDate,
          subPocketId,
          isPending,
        });
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.createMovementDirect(type, accountId, pocketId, amount, notes, displayedDate, subPocketId, isPending);
      }
    }
    return await this.createMovementDirect(type, accountId, pocketId, amount, notes, displayedDate, subPocketId, isPending);
  }

  // Create transfer (two movements)
  async createTransfer(
    sourceAccountId: string,
    sourcePocketId: string,
    targetAccountId: string,
    targetPocketId: string,
    amount: number,
    displayedDate: string,
    notes?: string
  ): Promise<{ expense: Movement; income: Movement }> {
    if (this.useBackend) {
      try {
        return await apiClient.post<{ expense: Movement; income: Movement }>('/api/movements/transfer', {
          sourceAccountId,
          sourcePocketId,
          targetAccountId,
          targetPocketId,
          amount,
          displayedDate,
          notes,
        });
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.createTransferDirect(sourceAccountId, sourcePocketId, targetAccountId, targetPocketId, amount, displayedDate, notes);
      }
    }
    return await this.createTransferDirect(sourceAccountId, sourcePocketId, targetAccountId, targetPocketId, amount, displayedDate, notes);
  }

  // Direct Supabase implementation (fallback)
  private async createTransferDirect(
    sourceAccountId: string,
    sourcePocketId: string,
    targetAccountId: string,
    targetPocketId: string,
    amount: number,
    displayedDate: string,
    notes?: string
  ): Promise<{ expense: Movement; income: Movement }> {
    // Get the current user so the RPC can authorize the write.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not authenticated');

    // Single atomic call: both movements are inserted in one transaction.
    // If either insert fails, both are rolled back so money cannot vanish.
    const { data, error } = await supabase.rpc('create_transfer', {
      p_user_id: user.id,
      p_source_account_id: sourceAccountId,
      p_source_pocket_id: sourcePocketId,
      p_target_account_id: targetAccountId,
      p_target_pocket_id: targetPocketId,
      p_amount: amount,
      p_displayed_date: displayedDate,
      p_notes: notes ?? null,
    });

    if (error) throw error;
    if (!data || !data.expense || !data.income) {
      throw new Error('create_transfer RPC returned unexpected payload');
    }

    return {
      expense: mapMovementRow(data.expense),
      income: mapMovementRow(data.income),
    };
  }

  // Direct Supabase implementation (fallback)
  private async createMovementDirect(
    type: MovementType,
    accountId: string,
    pocketId: string,
    amount: number,
    notes?: string,
    displayedDate?: string,
    subPocketId?: string,
    isPending?: boolean
  ): Promise<Movement> {
    // Validate amount (allow zero for tracking purposes)
    if (amount < 0) {
      throw new Error('Movement amount cannot be negative.');
    }

    // Validate account exists
    const accountService = await getAccountService();
    const account = await accountService.getAccount(accountId);
    if (!account) {
      throw new Error(`Account with id "${accountId}" not found.`);
    }

    // Validate pocket exists
    const pocketService = await getPocketService();
    const pocket = await pocketService.getPocket(pocketId);
    if (!pocket) {
      throw new Error(`Pocket with id "${pocketId}" not found.`);
    }

    // Validate sub-pocket if provided
    if (subPocketId) {
      const subPocketService = await getSubPocketService();
      const subPocket = await subPocketService.getSubPocket(subPocketId);
      if (!subPocket) {
        throw new Error(`Sub-pocket with id "${subPocketId}" not found.`);
      }
      // Validate sub-pocket belongs to the specified pocket
      if (subPocket.pocketId !== pocketId) {
        throw new Error('Sub-pocket does not belong to the specified pocket.');
      }
    }

    const now = new Date().toISOString();
    const movement: Movement = {
      id: generateId(),
      type,
      accountId,
      pocketId,
      subPocketId,
      amount,
      notes: notes?.trim(),
      displayedDate: displayedDate || now,
      createdAt: now,
      isPending: isPending || false,
    };

    // Insert directly - much faster
    await SupabaseStorageService.insertMovement(movement);

    // Balance updates are handled automatically by database triggers
    // (calculate_pocket_balance fires on INSERT)

    return movement;
  }

  // Update movement
  async updateMovement(
    id: string,
    updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>
  ): Promise<Movement> {
    if (this.useBackend) {
      try {
        return await apiClient.put<Movement>(`/api/movements/${id}`, updates);
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.updateMovementDirect(id, updates);
      }
    }
    return await this.updateMovementDirect(id, updates);
  }

  // Direct Supabase implementation (fallback)
  private async updateMovementDirect(
    id: string,
    updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>
  ): Promise<Movement> {
    const movements = await this.getAllMovementsDirect();
    const index = movements.findIndex(m => m.id === id);

    if (index === -1) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    const oldMovement = movements[index];
    const updatedMovement = { ...oldMovement, ...updates };

    // Update directly - balance recalculation handled by database triggers
    await SupabaseStorageService.updateMovement(id, updates);

    return updatedMovement;
  }

  // Delete movement
  async deleteMovement(id: string): Promise<void> {
    if (this.useBackend) {
      try {
        await apiClient.delete(`/api/movements/${id}`);
        return;
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.deleteMovementDirect(id);
      }
    }
    return await this.deleteMovementDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async deleteMovementDirect(id: string): Promise<void> {
    const movement = await this.getMovement(id);
    if (!movement) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    // Delete directly - balance recalculation handled by database triggers
    await SupabaseStorageService.deleteMovement(id);
  }

  // Get pending movements
  async getPendingMovements(): Promise<Movement[]> {
    if (this.useBackend) {
      try {
        return await apiClient.get<Movement[]>('/api/movements/pending');
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.getPendingMovementsDirect();
      }
    }
    return await this.getPendingMovementsDirect();
  }

  // Direct Supabase implementation (fallback)
  private async getPendingMovementsDirect(): Promise<Movement[]> {
    const movements = await this.getAllMovementsDirect();
    return movements.filter(m => m.isPending === true);
  }

  // Get applied (non-pending) movements
  async getAppliedMovements(): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.filter(m => !m.isPending);
  }

  // Apply a pending movement (convert to applied)
  async applyPendingMovement(id: string): Promise<Movement> {
    if (this.useBackend) {
      try {
        return await apiClient.post<Movement>(`/api/movements/${id}/apply`, {});
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.applyPendingMovementDirect(id);
      }
    }
    return await this.applyPendingMovementDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async applyPendingMovementDirect(id: string): Promise<Movement> {
    const movement = await this.getMovement(id);
    if (!movement) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    if (!movement.isPending) {
      throw new Error('Movement is already applied.');
    }

    // Mark as applied - trigger will recalculate balance since is_pending changes
    await SupabaseStorageService.updateMovement(id, { isPending: false });

    return { ...movement, isPending: false };
  }

  // Mark an applied movement as pending (reverse of applyPendingMovement)
  async markAsPending(id: string): Promise<Movement> {
    if (this.useBackend) {
      try {
        return await apiClient.post<Movement>(`/api/movements/${id}/mark-pending`, {});
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.markAsPendingDirect(id);
      }
    }
    return await this.markAsPendingDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async markAsPendingDirect(id: string): Promise<Movement> {
    const movement = await this.getMovement(id);
    if (!movement) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    if (movement.isPending) {
      throw new Error('Movement is already pending.');
    }

    // Mark as pending - trigger will recalculate balance since is_pending changes
    await SupabaseStorageService.updateMovement(id, { isPending: true });

    return { ...movement, isPending: true };
  }

  // Get count of movements by account
  async getMovementCountByAccount(accountId: string): Promise<number> {
    const movements = await this.getAllMovements();
    return movements.filter(m => m.accountId === accountId).length;
  }

  // Get count of movements by pocket
  async getMovementCountByPocket(pocketId: string): Promise<number> {
    const movements = await this.getAllMovements();
    return movements.filter(m => m.pocketId === pocketId).length;
  }

  // Delete all movements by account (for cascade delete)
  async deleteMovementsByAccount(accountId: string): Promise<number> {
    const { data } = await supabase
      .from('movements')
      .select('id')
      .eq('account_id', accountId);
    const count = data?.length || 0;
    if (count > 0) {
      const { error } = await supabase
        .from('movements')
        .delete()
        .eq('account_id', accountId);
      if (error) throw error;
    }
    return count;
  }

  // Delete all movements by pocket (for cascade delete)
  async deleteMovementsByPocket(pocketId: string): Promise<number> {
    const { data } = await supabase
      .from('movements')
      .select('id')
      .eq('pocket_id', pocketId);
    const count = data?.length || 0;
    if (count > 0) {
      const { error } = await supabase
        .from('movements')
        .delete()
        .eq('pocket_id', pocketId);
      if (error) throw error;
    }
    return count;
  }

  // Find orphaned movements that match an account/pocket (for restoration)
  async findMatchingOrphanedMovements(
    accountName: string,
    accountCurrency: string,
    pocketName?: string
  ): Promise<Movement[]> {
    const orphaned = await this.getOrphanedMovements();

    return orphaned.filter(m =>
      m.orphanedAccountName === accountName &&
      m.orphanedAccountCurrency === accountCurrency &&
      (!pocketName || m.orphanedPocketName === pocketName)
    );
  }

  // Restore all orphaned movements automatically (backend API)
  async restoreAllOrphanedMovements(): Promise<{ restored: number; failed: number }> {
    if (this.useBackend) {
      try {
        return await apiClient.post<{ restored: number; failed: number }>('/api/movements/restore-orphaned', {});
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        // For fallback, we'll need to implement the matching logic
        throw new Error('Automatic orphaned movement restoration requires backend API');
      }
    }
    throw new Error('Automatic orphaned movement restoration requires backend API');
  }

  // Restore orphaned movements to a new account/pocket (manual restoration)
  async restoreOrphanedMovements(
    movementIds: string[],
    newAccountId: string,
    newPocketId: string
  ): Promise<number> {
    for (const id of movementIds) {
      await SupabaseStorageService.updateMovement(id, {
        accountId: newAccountId,
        pocketId: newPocketId,
        isOrphaned: false,
      });
    }

    return movementIds.length;
  }

  // Recalculate balances for a pocket after restoration
  async recalculateBalancesForPocket(pocketId: string): Promise<void> {
    const pocketService = await getPocketService();
    const accountService = await getAccountService();

    // Get all movements for this pocket
    const movements = await this.getMovementsByPocket(pocketId);

    // Calculate balance from movements (EXCLUDING PENDING)
    const balance = movements
      .filter(m => !m.isPending) // Only include applied movements
      .reduce((sum, m) => {
        const isIncome = m.type === 'IngresoNormal' || m.type === 'IngresoFijo';
        return sum + (isIncome ? m.amount : -m.amount);
      }, 0);

    // Update pocket balance
    const pocket = await pocketService.getPocket(pocketId);
    if (pocket) {
      await SupabaseStorageService.updatePocket(pocketId, { balance });

      // Update account balance
      await accountService.recalculateAccountBalance(pocket.accountId);
    }
  }

  // Balance recalculation is handled by database triggers.
  // This method is kept as a no-op for backward compatibility with callers (e.g., SettingsPage).
  // The triggers on the movements table automatically maintain pocket and account balances.
  async recalculateAllPocketBalances(): Promise<void> {
    // No-op: database triggers handle balance calculation
    // If balances are out of sync, run the SQL from migration 002 directly.
  }

  // Mark movements as orphaned (soft delete) — bulk operation
  async markMovementsAsOrphaned(id: string, type: 'account' | 'pocket'): Promise<number> {
    // Get account/pocket name BEFORE orphaning
    const accountService = await getAccountService();
    const pocketService = await getPocketService();

    let orphanedAccountName = 'Unknown';
    let orphanedAccountCurrency = 'USD';
    let orphanedPocketName = 'Unknown';

    if (type === 'account') {
      const account = await accountService.getAccount(id);
      orphanedAccountName = account?.name || 'Unknown';
      orphanedAccountCurrency = account?.currency || 'USD';
    } else {
      const pocket = await pocketService.getPocket(id);
      orphanedPocketName = pocket?.name || 'Unknown';
      if (pocket) {
        const account = await accountService.getAccount(pocket.accountId);
        orphanedAccountName = account?.name || 'Unknown';
        orphanedAccountCurrency = account?.currency || 'USD';
      }
    }

    // Bulk update all matching movements
    const filterCol = type === 'account' ? 'account_id' : 'pocket_id';
    const { data, error } = await supabase
      .from('movements')
      .update({
        is_orphaned: true,
        orphaned_account_name: orphanedAccountName,
        orphaned_account_currency: orphanedAccountCurrency,
        orphaned_pocket_name: orphanedPocketName,
      })
      .eq(filterCol, id)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  // Update movements' accountId when migrating a pocket to another account
  async updateMovementsAccountForPocket(pocketId: string, newAccountId: string): Promise<number> {
    const { data, error } = await supabase
      .from('movements')
      .update({ account_id: newAccountId })
      .eq('pocket_id', pocketId)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }
}

export const movementService = new MovementService();

