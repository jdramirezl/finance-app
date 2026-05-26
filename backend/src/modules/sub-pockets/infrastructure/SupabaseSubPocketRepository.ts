/**
 * Supabase SubPocket Repository Implementation
 * 
 * Implements ISubPocketRepository using Supabase as the data store.
 */

import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import type { ISubPocketRepository } from './ISubPocketRepository';
import { SubPocket } from '../domain/SubPocket';
import { SubPocketMapper } from '../application/mappers/SubPocketMapper';
import { DatabaseError } from '../../../shared/errors/AppError';

@injectable()
export class SupabaseSubPocketRepository implements ISubPocketRepository {
  private supabase: SupabaseClient;

  constructor(@inject('SupabaseClient') supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Save a new sub-pocket to the database
   */
  async save(subPocket: SubPocket, userId: string): Promise<void> {
    const data = SubPocketMapper.toPersistence(subPocket, userId);
    
    const { error } = await this.supabase
      .from('sub_pockets')
      .insert(data);

    if (error) {
      throw new DatabaseError(`Failed to save sub-pocket: ${error.message}`);
    }
  }

  /**
   * Find sub-pocket by ID
   */
  async findById(id: string, userId: string): Promise<SubPocket | null> {
    const { data, error } = await this.supabase
      .from('sub_pockets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Not found is not an error - return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to find sub-pocket: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return SubPocketMapper.toDomain(data);
  }

  /**
   * Find all sub-pockets for a specific pocket, sorted by display order
   */
  async findByPocketId(pocketId: string, userId: string): Promise<SubPocket[]> {
    const { data, error } = await this.supabase
      .from('sub_pockets')
      .select('*')
      .eq('pocket_id', pocketId)
      .eq('user_id', userId)
      .order('display_order', { ascending: true, nullsFirst: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch sub-pockets by pocket: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => SubPocketMapper.toDomain(row));
  }

  /**
   * Find all sub-pockets for a specific group, sorted by display order
   */
  async findByGroupId(groupId: string, userId: string): Promise<SubPocket[]> {
    const { data, error } = await this.supabase
      .from('sub_pockets')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .order('display_order', { ascending: true, nullsFirst: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch sub-pockets by group: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => SubPocketMapper.toDomain(row));
  }

  /**
   * Find all sub-pockets for a user, sorted by display order
   */
  async findAllByUserId(userId: string): Promise<SubPocket[]> {
    const { data, error } = await this.supabase
      .from('sub_pockets')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true, nullsFirst: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch sub-pockets: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => SubPocketMapper.toDomain(row));
  }

  /**
   * Update an existing sub-pocket
   */
  async update(subPocket: SubPocket, userId: string): Promise<void> {
    const data = SubPocketMapper.toPersistence(subPocket, userId);
    
    // Remove id from update data (can't update primary key)
    const { id, ...updateData } = data;

    const { error } = await this.supabase
      .from('sub_pockets')
      .update(updateData)
      .eq('id', subPocket.id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to update sub-pocket: ${error.message}`);
    }
  }

  /**
   * Delete a sub-pocket
   */
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sub_pockets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to delete sub-pocket: ${error.message}`);
    }
  }

  /**
   * Delete all sub-pockets belonging to the given pocket IDs (bulk operation)
   */
  async deleteByPocketIds(pocketIds: string[], userId: string): Promise<number> {
    if (pocketIds.length === 0) return 0;

    const { data, error } = await this.supabase
      .from('sub_pockets')
      .delete()
      .in('pocket_id', pocketIds)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new DatabaseError(`Failed to bulk delete sub-pockets: ${error.message}`);
    }

    return data?.length ?? 0;
  }

  /**
   * Update display order for multiple sub-pockets
   */
  async updateDisplayOrders(subPocketIds: string[], userId: string): Promise<void> {
    // Update each sub-pocket's display order based on its position in the array
    for (let index = 0; index < subPocketIds.length; index++) {
      const { error } = await this.supabase
        .from('sub_pockets')
        .update({
          display_order: index,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subPocketIds[index])
        .eq('user_id', userId);

      if (error) {
        throw new DatabaseError(`Failed to update display order for sub-pocket ${subPocketIds[index]}: ${error.message}`);
      }
    }
  }

  /**
   * Count movements for a sub-pocket
   * Used to check if sub-pocket can be deleted
   */
  async countMovements(subPocketId: string, userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('movements')
      .select('id', { count: 'exact', head: true })
      .eq('sub_pocket_id', subPocketId)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to count movements: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Check if sub-pocket has any movements
   */
  async hasMovements(subPocketId: string, userId: string): Promise<boolean> {
    const count = await this.countMovements(subPocketId, userId);
    return count > 0;
  }

  /**
   * Nullify sub_pocket_id on all movements linked to this sub-pocket
   */
  async detachMovements(subPocketId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('movements')
      .update({ sub_pocket_id: null })
      .eq('sub_pocket_id', subPocketId)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to detach movements from sub-pocket: ${error.message}`);
    }
  }
}
