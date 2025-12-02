/**
 * Supabase Stock Price Repository Implementation
 * 
 * Implements IStockPriceRepository using Supabase as the data store.
 * Provides database-level caching for stock prices with 24-hour expiration.
 * 
 * Requirements: 13.1-13.4
 */

import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IStockPriceRepository } from './IStockPriceRepository';
import { StockPrice } from '../domain/StockPrice';
import { DatabaseError } from '../../../shared/errors/AppError';

interface StockPriceRow {
  id: string;
  symbol: string;
  price: number;
  currency: string;
  market_state: string | null;
  last_updated: string;
  created_at: string;
}

@injectable()
export class SupabaseStockPriceRepository implements IStockPriceRepository {
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
   * Find stock price by symbol
   * 
   * @param symbol - Stock symbol (e.g., 'VOO', 'AAPL')
   * @returns StockPrice if found, null otherwise
   */
  async findBySymbol(symbol: string): Promise<StockPrice | null> {
    const { data, error } = await this.ensureClient()
      .from('stock_prices')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (error) {
      // Not found is not an error - return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to find stock price: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.toDomain(data);
  }

  /**
   * Save or update stock price
   * 
   * Uses upsert to handle both insert and update cases.
   * 
   * @param stockPrice - StockPrice to save
   */
  async save(stockPrice: StockPrice): Promise<void> {
    const data = this.toPersistence(stockPrice);

    const { error } = await this.ensureClient()
      .from('stock_prices')
      .upsert(data, {
        onConflict: 'symbol',
        ignoreDuplicates: false,
      });

    if (error) {
      throw new DatabaseError(`Failed to save stock price: ${error.message}`);
    }
  }

  /**
   * Delete expired stock prices (cleanup utility)
   * 
   * Deletes prices older than 24 hours.
   * 
   * @returns Number of deleted records
   */
  async deleteExpired(): Promise<number> {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() - 24);

    const { data, error } = await this.ensureClient()
      .from('stock_prices')
      .delete()
      .lt('last_updated', expirationDate.toISOString())
      .select('id');

    if (error) {
      throw new DatabaseError(`Failed to delete expired stock prices: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Convert database row to domain entity
   */
  private toDomain(row: StockPriceRow): StockPrice {
    return new StockPrice(
      row.symbol,
      row.price,
      new Date(row.last_updated)
    );
  }

  /**
   * Convert domain entity to database row
   */
  private toPersistence(stockPrice: StockPrice): Partial<StockPriceRow> {
    return {
      id: stockPrice.symbol, // Use symbol as ID for easy upsert
      symbol: stockPrice.symbol,
      price: stockPrice.price,
      currency: 'USD', // Stock prices are always in USD
      last_updated: stockPrice.cachedAt.toISOString(),
    };
  }
}
