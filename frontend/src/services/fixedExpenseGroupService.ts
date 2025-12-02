import type { FixedExpenseGroup } from '../types';
import { supabase } from '../lib/supabase';
import { apiClient } from './apiClient';

const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001';

class FixedExpenseGroupService {
  // Feature flag to control backend usage
  private useBackend = import.meta.env.VITE_USE_BACKEND_FIXED_EXPENSE_GROUPS === 'true';

  constructor() {
    // Log which mode we're in
    if (this.useBackend) {
      console.log('🚀 FixedExpenseGroupService: Using BACKEND API at', import.meta.env.VITE_API_URL);
    } else {
      console.log('📦 FixedExpenseGroupService: Using DIRECT Supabase calls');
    }
  }
  // Get all groups
  async getAll(): Promise<FixedExpenseGroup[]> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: GET /api/fixed-expense-groups');
        return await apiClient.get<FixedExpenseGroup[]>('/api/fixed-expense-groups');
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.getAllDirect();
      }
    }
    return await this.getAllDirect();
  }

  // Direct Supabase implementation (fallback)
  private async getAllDirect(): Promise<FixedExpenseGroup[]> {
    try {
      const { data, error } = await supabase
        .from('fixed_expense_groups')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(group => ({
        id: group.id,
        name: group.name,
        color: group.color,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      }));
    } catch (error) {
      console.error('Error loading fixed expense groups:', error);
      throw error;
    }
  }

  // Get group by ID
  async getById(id: string): Promise<FixedExpenseGroup | null> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: GET /api/fixed-expense-groups/' + id);
        return await apiClient.get<FixedExpenseGroup>(`/api/fixed-expense-groups/${id}`);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.getByIdDirect(id);
      }
    }
    return await this.getByIdDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async getByIdDirect(id: string): Promise<FixedExpenseGroup | null> {
    try {
      const { data, error } = await supabase
        .from('fixed_expense_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        color: data.color,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error loading fixed expense group:', error);
      return null;
    }
  }

  // Create new group
  async create(name: string, color: string): Promise<FixedExpenseGroup> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: POST /api/fixed-expense-groups', { name, color });
        return await apiClient.post<FixedExpenseGroup>('/api/fixed-expense-groups', {
          name,
          color,
        });
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.createDirect(name, color);
      }
    }
    return await this.createDirect(name, color);
  }

  // Direct Supabase implementation (fallback)
  private async createDirect(name: string, color: string): Promise<FixedExpenseGroup> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('fixed_expense_groups')
        .insert({
          name,
          color,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        color: data.color,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating fixed expense group:', error);
      throw error;
    }
  }

  // Update group
  async update(id: string, name: string, color: string): Promise<void> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: PUT /api/fixed-expense-groups/' + id, { name, color });
        await apiClient.put(`/api/fixed-expense-groups/${id}`, {
          name,
          color,
        });
        return;
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.updateDirect(id, name, color);
      }
    }
    return await this.updateDirect(id, name, color);
  }

  // Direct Supabase implementation (fallback)
  private async updateDirect(id: string, name: string, color: string): Promise<void> {
    try {
      // Prevent updating default group name
      if (id === DEFAULT_GROUP_ID) {
        throw new Error('Cannot rename the Default group');
      }

      const { error } = await supabase
        .from('fixed_expense_groups')
        .update({
          name,
          color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating fixed expense group:', error);
      throw error;
    }
  }

  // Delete group (moves expenses to Default group)
  async delete(id: string): Promise<void> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: DELETE /api/fixed-expense-groups/' + id);
        await apiClient.delete(`/api/fixed-expense-groups/${id}`);
        return;
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.deleteDirect(id);
      }
    }
    return await this.deleteDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async deleteDirect(id: string): Promise<void> {
    try {
      // Prevent deleting default group
      if (id === DEFAULT_GROUP_ID) {
        throw new Error('Cannot delete the Default group');
      }

      // Move all expenses in this group to Default group
      const { error: moveError } = await supabase
        .from('sub_pockets')
        .update({ group_id: DEFAULT_GROUP_ID })
        .eq('group_id', id);

      if (moveError) throw moveError;

      // Delete the group
      const { error: deleteError } = await supabase
        .from('fixed_expense_groups')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting fixed expense group:', error);
      throw error;
    }
  }

  // Check if group is default
  isDefaultGroup(id: string): boolean {
    return id === DEFAULT_GROUP_ID;
  }

  // Get default group ID
  getDefaultGroupId(): string {
    return DEFAULT_GROUP_ID;
  }
}

export const fixedExpenseGroupService = new FixedExpenseGroupService();
