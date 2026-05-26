import type { Pocket } from '../types';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import { mapPocketRow } from './mappers';

class PocketService {
  // Get all pockets directly from Supabase.
  // When includeArchived is true, soft-archived pockets (archived_at IS NOT NULL)
  // are included — used by the Accounts page to render the "Archived" section
  // with both archived accounts and orphaned archived pockets that still
  // belong to active accounts.
  async getAllPockets(includeArchived: boolean = false): Promise<Pocket[]> {
    let query = supabase
      .from('pockets')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false });
    if (!includeArchived) query = query.is('archived_at', null);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch pockets: ${error.message}`);
    return (data ?? []).map(mapPocketRow);
  }

  // Get pocket by ID directly from Supabase
  async getPocket(id: string): Promise<Pocket | null> {
    const { data, error } = await supabase
      .from('pockets')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data ? mapPocketRow(data) : null;
  }

  // Get pockets by account directly from Supabase
  async getPocketsByAccount(accountId: string): Promise<Pocket[]> {
    const { data, error } = await supabase
      .from('pockets')
      .select('*')
      .eq('account_id', accountId)
      .order('display_order', { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPocketRow);
  }

  // Create new pocket
  async createPocket(accountId: string, name: string, type: Pocket['type']): Promise<Pocket> {
    return await apiClient.post<Pocket>('/api/pockets', {
      accountId,
      name,
      type,
    });
  }

  // Update pocket
  async updatePocket(id: string, updates: Partial<Pick<Pocket, 'name'>>): Promise<Pocket> {
    return await apiClient.put<Pocket>(`/api/pockets/${id}`, updates);
  }

  // Delete pocket
  async deletePocket(id: string): Promise<void> {
    await apiClient.delete(`/api/pockets/${id}`);
  }

  // Soft-delete (archive) a pocket.
  async archivePocket(id: string): Promise<void> {
    await apiClient.patch(`/api/pockets/${id}/archive`);
  }

  // Restore a previously archived pocket.
  async unarchivePocket(id: string): Promise<void> {
    await apiClient.patch(`/api/pockets/${id}/unarchive`);
  }

  // Get the fixed expenses pocket (there should only be one)
  async getFixedExpensesPocket(): Promise<Pocket | null> {
    const pockets = await this.getAllPockets();
    return pockets.find(p => p.type === 'fixed') || null;
  }

  // Migrate fixed pocket to another account
  async migrateFixedPocketToAccount(pocketId: string, targetAccountId: string): Promise<Pocket> {
    return await apiClient.post<Pocket>(`/api/pockets/${pocketId}/migrate`, {
      targetAccountId,
    });
  }

  // Reorder pockets within an account
  async reorderPockets(accountId: string, pocketIds: string[]): Promise<void> {
    await apiClient.post('/api/pockets/reorder', { accountId, pocketIds });
  }
}

export const pocketService = new PocketService();
