import type { Pocket } from '../types';
import { apiClient } from './apiClient';

class PocketService {
  // Get all pockets.
  // When includeArchived is true, soft-archived pockets (archived_at IS NOT NULL)
  // are included — used by the Accounts page to render the "Archived" section
  // with both archived accounts and orphaned archived pockets that still
  // belong to active accounts.
  async getAllPockets(includeArchived: boolean = false): Promise<Pocket[]> {
    const path = includeArchived
      ? '/api/pockets?include_archived=true'
      : '/api/pockets';
    return await apiClient.get<Pocket[]>(path);
  }

  // Get pocket by ID
  async getPocket(id: string): Promise<Pocket | null> {
    return await apiClient.get<Pocket>(`/api/pockets/${id}`);
  }

  // Get pockets by account
  async getPocketsByAccount(accountId: string): Promise<Pocket[]> {
    return await apiClient.get<Pocket[]>(`/api/pockets?accountId=${accountId}`);
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
