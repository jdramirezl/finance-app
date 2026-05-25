/**
 * Supabase Pocket Repository Implementation
 * 
 * Implements IPocketRepository using Supabase as the data store.
 */

import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import type { IPocketRepository } from './IPocketRepository';
import { Pocket } from '../domain/Pocket';
import { PocketMapper } from '../application/mappers/PocketMapper';
import { DatabaseError } from '../../../shared/errors/AppError';

@injectable()
export class SupabasePocketRepository implements IPocketRepository {
  private supabase: SupabaseClient;

  constructor(@inject('SupabaseClient') supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Save a new pocket to the database
   */
  async save(pocket: Pocket, userId: string): Promise<void> {
    const data = PocketMapper.toPersistence(pocket, userId);
    
    const { error } = await this.supabase
      .from('pockets')
      .insert(data);

    if (error) {
      throw new DatabaseError(`Failed to save pocket: ${error.message}`);
    }
  }

  /**
   * Find pocket by ID
   */
  async findById(id: string, userId: string): Promise<Pocket | null> {
    const { data, error } = await this.supabase
      .from('pockets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Not found is not an error - return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to find pocket: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return PocketMapper.toDomain(data);
  }

  /**
   * Find all pockets for a specific account, sorted by display order.
   *
   * By default, archived pockets (archived_at IS NOT NULL) are excluded.
   * Pass `includeArchived = true` to include them.
   */
  async findByAccountId(accountId: string, userId: string, includeArchived = false): Promise<Pocket[]> {
    let query = this.supabase
      .from('pockets')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (!includeArchived) {
      query = query.is('archived_at', null);
    }

    const { data, error } = await query.order('display_order', { ascending: true, nullsFirst: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch pockets by account: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => PocketMapper.toDomain(row));
  }

  /**
   * Find all pockets for a user, sorted by display order.
   *
   * By default, archived pockets (archived_at IS NOT NULL) are excluded.
   * Pass `includeArchived = true` to include them.
   */
  async findAllByUserId(userId: string, includeArchived = false): Promise<Pocket[]> {
    let query = this.supabase
      .from('pockets')
      .select('*')
      .eq('user_id', userId);

    if (!includeArchived) {
      query = query.is('archived_at', null);
    }

    const { data, error } = await query.order('display_order', { ascending: true, nullsFirst: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch pockets: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => PocketMapper.toDomain(row));
  }

  /**
   * Check if pocket with name exists within an account
   */
  async existsByNameInAccount(
    name: string,
    accountId: string,
    userId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('pockets')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('name', name)
      .limit(1);

    if (error) {
      throw new DatabaseError(`Failed to check pocket existence: ${error.message}`);
    }

    return data !== null && data.length > 0;
  }

  /**
   * Check if pocket with name exists within an account, excluding a specific pocket ID
   */
  async existsByNameInAccountExcludingId(
    name: string,
    accountId: string,
    userId: string,
    excludeId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('pockets')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('name', name)
      .neq('id', excludeId)
      .limit(1);

    if (error) {
      throw new DatabaseError(`Failed to check pocket existence: ${error.message}`);
    }

    return data !== null && data.length > 0;
  }

  /**
   * Check if a fixed pocket exists in a specific account
   */
  async existsFixedPocketInAccount(accountId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('pockets')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('type', 'fixed')
      .limit(1);

    if (error) {
      throw new DatabaseError(`Failed to check fixed pocket existence in account: ${error.message}`);
    }

    return data !== null && data.length > 0;
  }

  /**
   * Check if a fixed pocket exists for the user (global uniqueness)
   */
  async existsFixedPocketForUser(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('pockets')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'fixed')
      .limit(1);

    if (error) {
      throw new DatabaseError(`Failed to check fixed pocket existence: ${error.message}`);
    }

    return data !== null && data.length > 0;
  }

  /**
   * Check if a fixed pocket exists for the user, excluding a specific pocket ID
   */
  async existsFixedPocketForUserExcludingId(
    userId: string,
    excludeId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('pockets')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'fixed')
      .neq('id', excludeId)
      .limit(1);

    if (error) {
      throw new DatabaseError(`Failed to check fixed pocket existence: ${error.message}`);
    }

    return data !== null && data.length > 0;
  }

  /**
   * Update an existing pocket
   */
  async update(pocket: Pocket, userId: string): Promise<void> {
    const data = PocketMapper.toPersistence(pocket, userId);
    
    // Remove id from update data (can't update primary key)
    const { id, ...updateData } = data;

    const { error } = await this.supabase
      .from('pockets')
      .update(updateData)
      .eq('id', pocket.id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to update pocket: ${error.message}`);
    }
  }

  /**
   * Delete a pocket
   */
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pockets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to delete pocket: ${error.message}`);
    }
  }

  /**
   * Archive (soft-delete) a pocket by stamping archived_at with the
   * current time. The row remains in the database so historical movements
   * retain referential integrity.
   */
  async archive(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pockets')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to archive pocket: ${error.message}`);
    }
  }

  /**
   * Restore a previously archived pocket by clearing archived_at.
   */
  async unarchive(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pockets')
      .update({ archived_at: null })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to unarchive pocket: ${error.message}`);
    }
  }

  /**
   * Delete all pockets for a given account (bulk operation)
   */
  async deleteByAccountId(accountId: string, userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('pockets')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new DatabaseError(`Failed to bulk delete pockets: ${error.message}`);
    }

    return data?.length ?? 0;
  }

  /**
   * Update display order for multiple pockets
   */
  async updateDisplayOrders(pocketIds: string[], userId: string): Promise<void> {
    // Update each pocket's display order based on its position in the array
    // We need to update them one by one since Supabase doesn't support batch updates easily
    for (let index = 0; index < pocketIds.length; index++) {
      const { error } = await this.supabase
        .from('pockets')
        .update({
          display_order: index,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pocketIds[index])
        .eq('user_id', userId);

      if (error) {
        throw new DatabaseError(`Failed to update display order for pocket ${pocketIds[index]}: ${error.message}`);
      }
    }
  }
}
