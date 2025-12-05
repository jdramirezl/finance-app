/**
 * Supabase FixedExpenseGroup Repository Implementation
 * 
 * Implements IFixedExpenseGroupRepository using Supabase as the data store.
 */

import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IFixedExpenseGroupRepository } from './IFixedExpenseGroupRepository';
import { FixedExpenseGroup } from '../domain/FixedExpenseGroup';
import { FixedExpenseGroupMapper } from '../application/mappers/FixedExpenseGroupMapper';
import { DatabaseError } from '../../../shared/errors/AppError';

@injectable()
export class SupabaseFixedExpenseGroupRepository implements IFixedExpenseGroupRepository {
  private supabase: SupabaseClient | null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // Only throw error in non-test environments
    if ((!supabaseUrl || !supabaseKey) && process.env.NODE_ENV !== 'test') {
      throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    }

    // Create client only if credentials are available
    this.supabase = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null;
  }

  private ensureClient(): SupabaseClient {
    if (!this.supabase) {
      throw new DatabaseError('Supabase client not configured');
    }
    return this.supabase;
  }

  /**
   * Save a new fixed expense group to the database
   */
  async save(group: FixedExpenseGroup, userId: string): Promise<void> {
    const data = FixedExpenseGroupMapper.toPersistence(group, userId);

    const { error } = await this.ensureClient()
      .from('fixed_expense_groups')
      .insert(data);

    if (error) {
      throw new DatabaseError(`Failed to save fixed expense group: ${error.message}`);
    }
  }

  /**
   * Find group by ID
   */
  async findById(id: string, userId: string): Promise<FixedExpenseGroup | null> {
    const { data, error } = await this.ensureClient()
      .from('fixed_expense_groups')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Not found is not an error - return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to find fixed expense group: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return FixedExpenseGroupMapper.toDomain(data);
  }

  /**
   * Find all groups for a user
   */
  async findAllByUserId(userId: string): Promise<FixedExpenseGroup[]> {
    const { data, error } = await this.ensureClient()
      .from('fixed_expense_groups')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new DatabaseError(`Failed to fetch fixed expense groups: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => FixedExpenseGroupMapper.toDomain(row));
  }

  /**
   * Update an existing group
   */
  async update(group: FixedExpenseGroup, userId: string): Promise<void> {
    const data = FixedExpenseGroupMapper.toPersistence(group, userId);

    // Remove id from update data (can't update primary key)
    const { id, ...updateData } = data;

    const { error } = await this.ensureClient()
      .from('fixed_expense_groups')
      .update(updateData)
      .eq('id', group.id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to update fixed expense group: ${error.message}`);
    }
  }

  /**
   * Delete a group
   */
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.ensureClient()
      .from('fixed_expense_groups')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to delete fixed expense group: ${error.message}`);
    }
  }
  /**
   * Update display order for multiple groups
   */
  async updateDisplayOrders(ids: string[], userId: string): Promise<void> {
    // We use individual updates instead of upsert because upsert requires all non-nullable fields (like name)
    // if it decides to insert (which happens if RLS hides the row or if it doesn't exist).
    // Also, upsert with partial data is risky.
    // Since we are just reordering existing groups, individual updates are safer.

    // Note: This is less efficient than a single batch update, but Supabase/Postgres 
    // doesn't support a clean "update multiple rows with different values" in one query easily
    // without using a complex CTE or CASE statement, which is hard to construct with the JS client.
    // Given the small number of groups (usually < 20), this is acceptable.

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const { error } = await this.ensureClient()
        .from('fixed_expense_groups')
        .update({
          display_order: i,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw new DatabaseError(`Failed to update order for group ${id}: ${error.message}`);
      }
    }
  }
}
