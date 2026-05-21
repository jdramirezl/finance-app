/**
 * Supabase Exchange Rate Repository Implementation
 * 
 * Implements IExchangeRateRepository using Supabase as the cache store.
 */

import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import type { IExchangeRateRepository } from './IExchangeRateRepository';
import { ExchangeRate } from '../domain/ExchangeRate';
import { ExchangeRateMapper } from '../application/mappers/ExchangeRateMapper';
import { DatabaseError } from '../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

@injectable()
export class SupabaseExchangeRateRepository implements IExchangeRateRepository {
  private supabase: SupabaseClient;

  constructor(@inject('SupabaseClient') supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Find cached exchange rate by currency pair
   * Returns null if not found or if expired (older than 24 hours)
   */
  async findRate(
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<ExchangeRate | null> {
    const { data, error } = await this.supabase
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
   * Uses upsert to handle both insert and update.
   * Also records the rate in exchange_rate_history (with 1-hour dedup).
   */
  async saveRate(exchangeRate: ExchangeRate): Promise<void> {
    const data = ExchangeRateMapper.toPersistence(exchangeRate);
    
    // Use upsert to handle both insert and update
    const { error } = await this.supabase
      .from('exchange_rates')
      .upsert(data, {
        onConflict: 'base_currency,target_currency',
        ignoreDuplicates: false,
      });

    if (error) {
      throw new DatabaseError(`Failed to save exchange rate: ${error.message}`);
    }

    // Record in history (fire-and-forget, dedup by 1 hour)
    await this.recordHistory(
      exchangeRate.fromCurrency,
      exchangeRate.toCurrency,
      exchangeRate.rate
    );
  }

  /**
   * Insert a row into exchange_rate_history if the last recorded rate
   * for this pair is older than 1 hour.
   */
  private async recordHistory(
    baseCurrency: string,
    targetCurrency: string,
    rate: number
  ): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Check if a recent record exists
      const { data: recent } = await this.supabase
        .from('exchange_rate_history')
        .select('id')
        .eq('base_currency', baseCurrency)
        .eq('target_currency', targetCurrency)
        .gte('recorded_at', oneHourAgo)
        .limit(1);

      if (recent && recent.length > 0) return;

      await this.supabase.from('exchange_rate_history').insert({
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        rate,
      });
    } catch {
      // Non-critical — don't fail the main save operation
      console.warn('Failed to record exchange rate history');
    }
  }

  /**
   * Delete expired exchange rates from cache
   * Removes rates older than 24 hours
   */
  async deleteExpired(): Promise<number> {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() - 24);

    const { data, error } = await this.supabase
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
