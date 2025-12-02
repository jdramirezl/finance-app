/**
 * Supabase Exchange Rate Repository Implementation
 * 
 * Implements IExchangeRateRepository using Supabase as the cache store.
 */

import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IExchangeRateRepository } from './IExchangeRateRepository';
import { ExchangeRate } from '../domain/ExchangeRate';
import { ExchangeRateMapper } from '../application/mappers/ExchangeRateMapper';
import { DatabaseError } from '../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

@injectable()
export class SupabaseExchangeRateRepository implements IExchangeRateRepository {
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
   * Find cached exchange rate by currency pair
   * Returns null if not found or if expired (older than 24 hours)
   */
  async findRate(
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<ExchangeRate | null> {
    const { data, error } = await this.ensureClient()
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', fromCurrency)
      .eq('target_currency', toCurrency)
      .single();

    if (error) {
      // Not found is not an error - return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to find exchange rate: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const exchangeRate = ExchangeRateMapper.toDomain(data);

    // Check if expired (24 hours)
    if (exchangeRate.isExpired()) {
      return null;
    }

    return exchangeRate;
  }

  /**
   * Save exchange rate to cache
   * Uses upsert to handle both insert and update
   */
  async saveRate(exchangeRate: ExchangeRate): Promise<void> {
    const data = ExchangeRateMapper.toPersistence(exchangeRate);
    
    // Use upsert to handle both insert and update
    const { error } = await this.ensureClient()
      .from('exchange_rates')
      .upsert(data, {
        onConflict: 'base_currency,target_currency',
        ignoreDuplicates: false,
      });

    if (error) {
      throw new DatabaseError(`Failed to save exchange rate: ${error.message}`);
    }
  }

  /**
   * Delete expired exchange rates from cache
   * Removes rates older than 24 hours
   */
  async deleteExpired(): Promise<number> {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() - 24);

    const { data, error } = await this.ensureClient()
      .from('exchange_rates')
      .delete()
      .lt('last_updated', expirationDate.toISOString())
      .select('base_currency'); // Select something to get count

    if (error) {
      throw new DatabaseError(`Failed to delete expired exchange rates: ${error.message}`);
    }

    return data?.length ?? 0;
  }
}
