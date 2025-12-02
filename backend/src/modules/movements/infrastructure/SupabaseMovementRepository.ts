/**
 * Supabase Movement Repository Implementation
 * 
 * Implements IMovementRepository using Supabase as the data store.
 */

import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IMovementRepository, MovementFilters, PaginationOptions } from './IMovementRepository';
import { Movement } from '../domain/Movement';
import { MovementMapper } from '../application/mappers/MovementMapper';
import { DatabaseError } from '../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

@injectable()
export class SupabaseMovementRepository implements IMovementRepository {
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
   * Save a new movement to the database
   */
  async save(movement: Movement, userId: string): Promise<void> {
    const data = MovementMapper.toPersistence(movement, userId);
    
    const { error } = await this.ensureClient()
      .from('movements')
      .insert(data);

    if (error) {
      throw new DatabaseError(`Failed to save movement: ${error.message}`);
    }
  }

  /**
   * Find movement by ID
   */
  async findById(id: string, userId: string): Promise<Movement | null> {
    const { data, error } = await this.ensureClient()
      .from('movements')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Not found is not an error - return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to find movement: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return MovementMapper.toDomain(data);
  }

  /**
   * Find all movements for a user with optional filters and pagination
   */
  async findAll(
    userId: string,
    filters?: MovementFilters,
    pagination?: PaginationOptions
  ): Promise<Movement[]> {
    let query = this.ensureClient()
      .from('movements')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (filters) {
      query = this.applyFilters(query, filters);
    }

    // Apply pagination
    if (pagination) {
      if (pagination.limit) {
        query = query.limit(pagination.limit);
      }
      if (pagination.offset) {
        query = query.range(pagination.offset, pagination.offset + (pagination.limit || 50) - 1);
      }
    }

    // Order by displayed date descending (most recent first)
    query = query.order('displayed_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to fetch movements: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => MovementMapper.toDomain(row));
  }

  /**
   * Find movements by account ID
   */
  async findByAccountId(
    accountId: string,
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]> {
    return this.findAll(userId, { accountId }, pagination);
  }

  /**
   * Find movements by pocket ID
   */
  async findByPocketId(
    pocketId: string,
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]> {
    return this.findAll(userId, { pocketId }, pagination);
  }

  /**
   * Find movements by sub-pocket ID
   */
  async findBySubPocketId(
    subPocketId: string,
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]> {
    return this.findAll(userId, { subPocketId }, pagination);
  }

  /**
   * Find movements by month
   */
  async findByMonth(
    year: number,
    month: number,
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]> {
    return this.findAll(userId, { year, month }, pagination);
  }

  /**
   * Find pending movements
   */
  async findPending(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]> {
    return this.findAll(userId, { isPending: true }, pagination);
  }

  /**
   * Find orphaned movements
   */
  async findOrphaned(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]> {
    return this.findAll(userId, { isOrphaned: true }, pagination);
  }

  /**
   * Find orphaned movements matching account name and currency
   */
  async findOrphanedByAccount(
    accountName: string,
    accountCurrency: Currency,
    userId: string
  ): Promise<Movement[]> {
    const { data, error } = await this.ensureClient()
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_orphaned', true)
      .eq('orphaned_account_name', accountName)
      .eq('orphaned_account_currency', accountCurrency)
      .order('displayed_date', { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch orphaned movements by account: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => MovementMapper.toDomain(row));
  }

  /**
   * Find orphaned movements matching account and pocket name
   */
  async findOrphanedByAccountAndPocket(
    accountName: string,
    accountCurrency: Currency,
    pocketName: string,
    userId: string
  ): Promise<Movement[]> {
    const { data, error } = await this.ensureClient()
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_orphaned', true)
      .eq('orphaned_account_name', accountName)
      .eq('orphaned_account_currency', accountCurrency)
      .eq('orphaned_pocket_name', pocketName)
      .order('displayed_date', { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch orphaned movements by account and pocket: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => MovementMapper.toDomain(row));
  }

  /**
   * Update an existing movement
   */
  async update(movement: Movement, userId: string): Promise<void> {
    const data = MovementMapper.toPersistence(movement, userId);
    
    // Remove id from update data (can't update primary key)
    const { id, ...updateData } = data;

    const { error } = await this.ensureClient()
      .from('movements')
      .update(updateData)
      .eq('id', movement.id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to update movement: ${error.message}`);
    }
  }

  /**
   * Delete a movement
   */
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.ensureClient()
      .from('movements')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to delete movement: ${error.message}`);
    }
  }

  /**
   * Delete all movements for an account (hard delete)
   */
  async deleteByAccountId(accountId: string, userId: string): Promise<number> {
    const { data, error } = await this.ensureClient()
      .from('movements')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new DatabaseError(`Failed to delete movements by account: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Delete all movements for a pocket (hard delete)
   */
  async deleteByPocketId(pocketId: string, userId: string): Promise<number> {
    const { data, error } = await this.ensureClient()
      .from('movements')
      .delete()
      .eq('pocket_id', pocketId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new DatabaseError(`Failed to delete movements by pocket: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Mark all movements for an account as orphaned
   */
  async markAsOrphanedByAccountId(
    accountId: string,
    accountName: string,
    accountCurrency: Currency,
    userId: string
  ): Promise<number> {
    // First, get the account's pocket name for each movement
    const { data: movements, error: fetchError } = await this.ensureClient()
      .from('movements')
      .select('id, pocket_id')
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (fetchError) {
      throw new DatabaseError(`Failed to fetch movements for orphaning: ${fetchError.message}`);
    }

    if (!movements || movements.length === 0) {
      return 0;
    }

    // Get pocket names (filter out null pocket IDs)
    const pocketIds = [...new Set(movements.map(m => m.pocket_id).filter(id => id !== null))];
    
    let pockets: Array<{ id: string; name: string }> = [];
    if (pocketIds.length > 0) {
      const { data, error: pocketError } = await this.ensureClient()
        .from('pockets')
        .select('id, name')
        .in('id', pocketIds);

      if (pocketError) {
        throw new DatabaseError(`Failed to fetch pocket names: ${pocketError.message}`);
      }
      
      pockets = data || [];
    }

    const pocketNameMap = new Map(pockets.map(p => [p.id, p.name]));

    // Update movements one by one with orphaned data
    // We use individual updates instead of bulk upsert to avoid not-null constraint violations
    for (const movement of movements) {
      const { error: updateError } = await this.ensureClient()
        .from('movements')
        .update({
          is_orphaned: true,
          orphaned_account_name: accountName,
          orphaned_account_currency: accountCurrency,
          orphaned_pocket_name: pocketNameMap.get(movement.pocket_id) || 'Unknown',
        })
        .eq('id', movement.id)
        .eq('user_id', userId);

      if (updateError) {
        throw new DatabaseError(`Failed to mark movement as orphaned: ${updateError.message}`);
      }
    }

    return movements.length;
  }

  /**
   * Mark all movements for a pocket as orphaned
   */
  async markAsOrphanedByPocketId(
    pocketId: string,
    pocketName: string,
    userId: string
  ): Promise<number> {
    // First, get the account info for the pocket
    const { data: pocket, error: pocketError } = await this.ensureClient()
      .from('pockets')
      .select('account_id')
      .eq('id', pocketId)
      .single();

    if (pocketError) {
      throw new DatabaseError(`Failed to fetch pocket: ${pocketError.message}`);
    }

    const { data: account, error: accountError } = await this.ensureClient()
      .from('accounts')
      .select('name, currency')
      .eq('id', pocket.account_id)
      .single();

    if (accountError) {
      throw new DatabaseError(`Failed to fetch account: ${accountError.message}`);
    }

    // Update movements
    const { data, error } = await this.ensureClient()
      .from('movements')
      .update({
        is_orphaned: true,
        orphaned_account_name: account.name,
        orphaned_account_currency: account.currency,
        orphaned_pocket_name: pocketName,
      })
      .eq('pocket_id', pocketId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new DatabaseError(`Failed to mark movements as orphaned by pocket: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Update account ID for all movements in a pocket (used during pocket migration)
   */
  async updateAccountIdByPocketId(
    pocketId: string,
    newAccountId: string,
    userId: string
  ): Promise<number> {
    const { data, error } = await this.ensureClient()
      .from('movements')
      .update({ account_id: newAccountId })
      .eq('pocket_id', pocketId)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new DatabaseError(`Failed to update account ID for movements: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Count movements by filters
   */
  async count(userId: string, filters?: MovementFilters): Promise<number> {
    let query = this.ensureClient()
      .from('movements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Apply filters
    if (filters) {
      query = this.applyFilters(query, filters);
    }

    const { count, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to count movements: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Apply filters to a query
   */
  private applyFilters(query: any, filters: MovementFilters): any {
    if (filters.accountId) {
      query = query.eq('account_id', filters.accountId);
    }

    if (filters.pocketId) {
      query = query.eq('pocket_id', filters.pocketId);
    }

    if (filters.subPocketId) {
      query = query.eq('sub_pocket_id', filters.subPocketId);
    }

    if (filters.isPending !== undefined) {
      query = query.eq('is_pending', filters.isPending);
    }

    if (filters.isOrphaned !== undefined) {
      query = query.eq('is_orphaned', filters.isOrphaned);
    }

    if (filters.startDate) {
      query = query.gte('displayed_date', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('displayed_date', filters.endDate.toISOString());
    }

    if (filters.year && filters.month) {
      // Filter for movements in that specific month
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);
      
      query = query
        .gte('displayed_date', startDate.toISOString())
        .lte('displayed_date', endDate.toISOString());
    }

    return query;
  }
}
