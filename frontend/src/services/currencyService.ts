import type { Currency } from '../types';
import { apiClient } from './apiClient';

// Mock exchange rates - used as a last-resort fallback for the synchronous
// getExchangeRate path when no async fetch has populated the in-memory cache yet.
const MOCK_EXCHANGE_RATES: Record<string, number> = {
  'USD_MXN': 18.26,
  'USD_COP': 3830.0,
  'USD_EUR': 0.92,
  'USD_GBP': 0.79,
  'MXN_USD': 1 / 18.26,
  'MXN_COP': 3830.0 / 18.26,
  'MXN_EUR': 0.92 / 18.26,
  'MXN_GBP': 0.79 / 18.26,
  'COP_USD': 1 / 3830.0,
  'COP_MXN': 18.26 / 3830.0,
  'COP_EUR': 0.92 / 3830.0,
  'COP_GBP': 0.79 / 3830.0,
  'EUR_USD': 1 / 0.92,
  'EUR_MXN': 18.26 / 0.92,
  'EUR_COP': 3830.0 / 0.92,
  'EUR_GBP': 0.79 / 0.92,
  'GBP_USD': 1 / 0.79,
  'GBP_MXN': 18.26 / 0.79,
  'GBP_COP': 3830.0 / 0.79,
  'GBP_EUR': 0.92 / 0.79,
};

interface CachedRate {
  rate: number;
  timestamp: number;
}

class CurrencyService {
  private cache: Map<string, CachedRate> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

  // Get exchange rate between two currencies (sync version for backward compatibility)
  // Reads from in-memory cache populated by previous async calls; falls back to mock rates.
  getExchangeRate(from: Currency, to: Currency): number {
    if (from === to) return 1;
    const key = `${from}_${to}`;

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.rate;
    }

    return MOCK_EXCHANGE_RATES[key] || 1;
  }

  // Get exchange rate from backend
  async getExchangeRateAsync(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;

    const response = await apiClient.get<{ from: string; to: string; rate: number; cachedAt: string }>(
      `/api/currency/rates?from=${from}&to=${to}`
    );

    // Populate in-memory cache so synchronous getExchangeRate can return live values
    this.cache.set(`${from}_${to}`, {
      rate: response.rate,
      timestamp: Date.now(),
    });

    return response.rate;
  }

  // Convert amount from one currency to another (sync, uses cached/mock rates)
  convertAmount(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
    if (fromCurrency === toCurrency) return amount;
    const rate = this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  // Format currency amount
  formatCurrency(amount: number, currency: Currency): string {
    return amount.toLocaleString(undefined, {
      style: 'currency',
      currency: currency,
    });
  }

  // Convert amount using backend conversion endpoint
  async convert(amount: number, from: Currency, to: Currency): Promise<number> {
    if (!amount || !from || !to) {
      console.warn('Invalid convert parameters:', { amount, from, to });
      return amount || 0;
    }

    const response = await apiClient.post<{ amount: number; convertedAmount: number; rate: number }>(
      '/api/currency/convert',
      {
        amount,
        fromCurrency: from,
        toCurrency: to,
      }
    );
    return response.convertedAmount;
  }

  // Debug: Get full rate details with source
  async getDebugRate(from: Currency, to: Currency): Promise<{ from: string; to: string; rate: number; cachedAt: string; source?: string }> {
    return await apiClient.get<{ from: string; to: string; rate: number; cachedAt: string; source?: string }>(
      `/api/currency/rates?from=${from}&to=${to}`
    );
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cache.clear();
  }
}

export const currencyService = new CurrencyService();
