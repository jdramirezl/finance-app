/**
 * Alpha Vantage Service Implementation
 * 
 * Implements IAlphaVantageService for fetching stock prices from Alpha Vantage API.
 * 
 * API Documentation: https://www.alphavantage.co/documentation/
 * 
 * Requirements: 13.4
 */

import { injectable } from 'tsyringe';
import type { IAlphaVantageService } from './IAlphaVantageService';

interface AlphaVantageGlobalQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

interface AlphaVantageErrorResponse {
  'Error Message'?: string;
  'Note'?: string;
  'Information'?: string;
}

@injectable()
export class AlphaVantageService implements IAlphaVantageService {
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey && process.env.NODE_ENV === 'production') {
      throw new Error('Alpha Vantage API key missing: ALPHA_VANTAGE_API_KEY required');
    }

    // Use 'demo' for testing/development if no key provided
    // Note: demo key has rate limits and may not work for all symbols
    this.apiKey = apiKey || 'demo';
    
    if (!apiKey) {
      console.warn('⚠️  Alpha Vantage API key not configured. Using demo key with limited functionality.');
    }
  }

  /**
   * Fetch current stock price from Alpha Vantage API
   * 
   * Uses the GLOBAL_QUOTE function which provides real-time price data.
   * 
   * @param symbol - Stock symbol (e.g., 'VOO', 'AAPL')
   * @returns Current stock price
   * @throws Error if API call fails or symbol not found
   */
  async fetchStockPrice(symbol: string): Promise<number> {
    const normalizedSymbol = symbol.toUpperCase();

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('function', 'GLOBAL_QUOTE');
      url.searchParams.append('symbol', normalizedSymbol);
      url.searchParams.append('apikey', this.apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Alpha Vantage API returned status ${response.status}`);
      }

      const data = await response.json() as AlphaVantageGlobalQuoteResponse | AlphaVantageErrorResponse;

      // Check for API errors
      if ('Error Message' in data) {
        throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
      }

      // Check for rate limit
      if ('Note' in data) {
        throw new Error(`Alpha Vantage API rate limit: ${data['Note']}`);
      }

      // Check for information message (usually means invalid API key)
      if ('Information' in data) {
        throw new Error(`Alpha Vantage API info: ${data['Information']}`);
      }

      // Extract price from response
      const globalQuote = (data as AlphaVantageGlobalQuoteResponse)['Global Quote'];
      
      if (!globalQuote || !globalQuote['05. price']) {
        throw new Error(`No price data found for symbol: ${normalizedSymbol}`);
      }

      const price = parseFloat(globalQuote['05. price']);

      if (isNaN(price) || price < 0) {
        throw new Error(`Invalid price data for symbol: ${normalizedSymbol}`);
      }

      return price;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch stock price for ${normalizedSymbol}: ${error.message}`);
      }
      throw new Error(`Failed to fetch stock price for ${normalizedSymbol}: Unknown error`);
    }
  }

  /**
   * Test API connectivity (useful for health checks)
   * 
   * @returns true if API is accessible, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a well-known symbol for testing
      await this.fetchStockPrice('IBM');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API key status (for debugging)
   * 
   * @returns Object with API key status
   */
  getApiKeyStatus(): { configured: boolean; isDemo: boolean } {
    return {
      configured: !!this.apiKey,
      isDemo: this.apiKey === 'demo',
    };
  }
}
