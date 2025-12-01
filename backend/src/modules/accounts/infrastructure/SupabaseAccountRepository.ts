/**
 * Supabase Account Repository Implementation
 * 
 * Implements IAccountRepository using Supabase as the data store.
 */

import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IAccountRepository } from './IAccountRepository';
import { Account } from '../domain/Account';
import { AccountMapper } from '../application/mappers/AccountMapper';
import { DatabaseError } from '../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

@injectable()
export class SupabaseAccountRepository implements IAccountRepository {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save a new account to the database
   */
  async save(account: Account, userId: string): Promise<void> {
    const data = AccountMapper.toPersistence(account, userId);
    
    const { error } = await this.supabase
      .from('accounts')
      .insert(data);

    if (error) {
      throw new DatabaseError(`Failed to save account: ${error.message}`);
    }
  }

  /**
   * Find account by ID
   */
  async findById(id: string, userId: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Not found is not an error - return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to find account: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return AccountMapper.toDomain(data);
  }

  /**
   * Find all accounts for a user, sorted by display order
   */
  async findAllByUserId(userId: string): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true, nullsFirst: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch accounts: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => AccountMapper.toDomain(row));
  }

  /**
   * Check if account with name and currency exists for user
   */
  async existsByNameAndCurrency(
    name: string,
    currency: Currency,
    userId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('currency', currency)
      .limit(1);

    if (error) {
      throw new DatabaseError(`Failed to check account existence: ${error.message}`);
    }

    return data !== null && data.length > 0;
  }

  /**
   * Check if account with name and currency exists for user, excluding specific account ID
   */
  async existsByNameAndCurrencyExcludingId(
    name: string,
    currency: Currency,
    userId: string,
    excludeId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('currency', currency)
      .neq('id', excludeId)
      .limit(1);

    if (error) {
      throw new DatabaseError(`Failed to check account existence: ${error.message}`);
    }

    return data !== null && data.length > 0;
  }

  /**
   * Update an existing account
   */
  async update(account: Account, userId: string): Promise<void> {
    const data = AccountMapper.toPersistence(account, userId);
    
    // Remove id from update data (can't update primary key)
    const { id, ...updateData } = data;

    const { error } = await this.supabase
      .from('accounts')
      .update(updateData)
      .eq('id', account.id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to update account: ${error.message}`);
    }
  }

  /**
   * Delete an account
   */
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to delete account: ${error.message}`);
    }
  }

  /**
   * Update display order for multiple accounts
   */
  async updateDisplayOrders(accountIds: string[], userId: string): Promise<void> {
    // Update each account's display order based on its position in the array
    const updates = accountIds.map((id, index) => ({
      id,
      user_id: userId,
      display_order: index,
      updated_at: new Date().toISOString(),
    }));

    // Perform batch update using upsert
    const { error } = await this.supabase
      .from('accounts')
      .upsert(updates, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (error) {
      throw new DatabaseError(`Failed to update display orders: ${error.message}`);
    }
  }
}
