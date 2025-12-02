/**
 * Supabase Pocket Repository Implementation
 * 
 * Implements IPocketRepository using Supabase as the data store.
 */

import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IPocketRepository } from './IPocketRepository';
import { Pocket } from '../domain/Pocket';
import { PocketMapper } from '../application/mappers/PocketMapper';
import { DatabaseError } from '../../../shared/errors/AppError';

@injectable()
export class SupabasePocketRepository implements IPocketRepository {
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
   * Save a new pocket to the database
   */
  async save(pocket: Pocket, userId: string): Promise<void> {
    const data = PocketMapper.toPersistence(pocket, userId);
    
    const { error } = await this.ensureClient()
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
    const { data, error } = await this.ensureClient()
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
   * Find all pockets for a specific account, sorted by display order
   */
  async findByAccountId(accountId: string, userId: string): Promise<Pocket[]> {
    const { data, error } = await this.ensureClient()
      .from('pockets')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .order('display_order', { ascending: true, nullsFirst: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch pockets by account: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => PocketMapper.toDomain(row));
  }

  /**
   * Find all pockets for a user, sorted by display order
   */
  async findAllByUserId(userId: string): Promise<Pocket[]> {
    const { data, error } = await this.ensureClient()
      .from('pockets')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true, nullsFirst: false });

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
    const { data, error } = await this.ensureClient()
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
    const { data, error } = await this.ensureClient()
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
   * Check if a fixed pocket exists for the user (global uniqueness)
   */
  async existsFixedPocketForUser(userId: string): Promise<boolean> {
    const { data, error } = await this.ensureClient()
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
    const { data, error } = await this.ensureClient()
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

    const { error } = await this.ensureClient()
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
    const { error } = await this.ensureClient()
      .from('pockets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to delete pocket: ${error.message}`);
    }
  }

  /**
   * Update display order for multiple pockets
   */
  async updateDisplayOrders(pocketIds: string[], userId: string): Promise<void> {
    // Update each pocket's display order based on its position in the array
    // We need to update them one by one since Supabase doesn't support batch updates easily
    for (let index = 0; index < pocketIds.length; index++) {
      const { error } = await this.ensureClient()
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
