import type { FixedExpenseGroup } from '../types';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import { mapFixedExpenseGroupRow } from './mappers';

class FixedExpenseGroupService {
  // Get all groups directly from Supabase
  async getAll(): Promise<FixedExpenseGroup[]> {
    const { data, error } = await supabase
      .from('fixed_expense_groups')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw new Error(`Failed to fetch fixed expense groups: ${error.message}`);
    return (data ?? []).map(mapFixedExpenseGroupRow);
  }

  // Get group by ID directly from Supabase
  async getById(id: string): Promise<FixedExpenseGroup | null> {
    const { data, error } = await supabase
      .from('fixed_expense_groups')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data ? mapFixedExpenseGroupRow(data) : null;
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
