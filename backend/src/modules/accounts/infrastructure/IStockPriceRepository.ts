/**
 * IStockPriceRepository Interface
 * 
 * Defines the contract for stock price persistence.
 * Infrastructure layer implements this interface.
 */

import type { StockPrice } from '../domain/StockPrice';

export interface IStockPriceRepository {
  /**
   * Find stock price by symbol
   * 
   * @param symbol - Stock symbol (e.g., 'VOO', 'AAPL')
   * @returns StockPrice if found, null otherwise
   */
  findBySymbol(symbol: string): Promise<StockPrice | null>;

  /**
   * Save or update stock price
   * 
   * @param stockPrice - StockPrice to save
   */
  save(stockPrice: StockPrice): Promise<void>;

  /**
   * Delete expired stock prices (cleanup utility)
   * 
   * @returns Number of deleted records
   */
  deleteExpired(): Promise<number>;
}
