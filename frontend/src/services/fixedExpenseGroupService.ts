import type { FixedExpenseGroup } from '../types';
import { apiClient } from './apiClient';

class FixedExpenseGroupService {
  // Get all groups
  async getAll(): Promise<FixedExpenseGroup[]> {
    return await apiClient.get<FixedExpenseGroup[]>('/api/fixed-expense-groups');
  }

  // Get group by ID
  async getById(id: string): Promise<FixedExpenseGroup | null> {
    return await apiClient.get<FixedExpenseGroup>(`/api/fixed-expense-groups/${id}`);
  }

  // Create new group
  async create(name: string, color: string): Promise<FixedExpenseGroup> {
    return await apiClient.post<FixedExpenseGroup>('/api/fixed-expense-groups', {
      name,
      color,
    });
  }

  // Update group
  async update(id: string, name: string, color: string): Promise<void> {
    await apiClient.put(`/api/fixed-expense-groups/${id}`, {
      name,
      color,
    });
  }

  // Delete group (backend moves expenses to Default group)
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/fixed-expense-groups/${id}`);
  }

  // Check if group is default (by name)
  isDefaultGroup(group: FixedExpenseGroup): boolean {
    return group.name === 'Default';
  }

  // Get user's default group
  async getDefaultGroup(): Promise<FixedExpenseGroup | null> {
    const groups = await this.getAll();
    return groups.find(g => g.name === 'Default') || null;
  }

  // Reorder groups
  async reorder(ids: string[]): Promise<void> {
    await apiClient.post('/api/fixed-expense-groups/reorder', { ids });
  }
}

export const fixedExpenseGroupService = new FixedExpenseGroupService();
