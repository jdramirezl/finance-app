/**
 * IAlphaVantageService Interface
 * 
 * Defines the contract for fetching stock prices from Alpha Vantage API.
 * Infrastructure layer implements this interface.
 */

export interface IAlphaVantageService {
  /**
   * Fetch current stock price from Alpha Vantage API
   * 
   * @param symbol - Stock symbol (e.g., 'VOO', 'AAPL')
   * @returns Current stock price
   * @throws Error if API call fails or symbol not found
   */
  fetchStockPrice(symbol: string): Promise<number>;
}
