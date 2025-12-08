import type { Currency } from '../types';
import { StorageService } from './storageService';
import { supabase } from '../lib/supabase';
import { apiClient } from './apiClient';

// Mock exchange rates (fallback if API fails)
const MOCK_EXCHANGE_RATES: Record<string, number> = {
  'USD_MXN': 17.0,
  'USD_COP': 4100.0,
  'USD_EUR': 0.92,
  'USD_GBP': 0.79,
  'MXN_USD': 1 / 17.0,
  'MXN_COP': 4100.0 / 17.0,
  'MXN_EUR': 0.92 / 17.0,
  'MXN_GBP': 0.79 / 17.0,
  'COP_USD': 1 / 4100.0,
  'COP_MXN': 17.0 / 4100.0,
  'COP_EUR': 0.92 / 4100.0,
  'COP_GBP': 0.79 / 4100.0,
  'EUR_USD': 1 / 0.92,
  'EUR_MXN': 17.0 / 0.92,
  'EUR_COP': 4100.0 / 0.92,
  'EUR_GBP': 0.79 / 0.92,
  'GBP_USD': 1 / 0.79,
  'GBP_MXN': 17.0 / 0.79,
  'GBP_COP': 4100.0 / 0.79,
  'GBP_EUR': 0.92 / 0.79,
};

interface CachedRate {
  rate: number;
  timestamp: number;
}

class CurrencyService {
  // Feature flag to control backend usage
  private useBackend = import.meta.env.VITE_USE_BACKEND_CURRENCY === 'true';
  private cache: Map<string, CachedRate> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
  private readonly API_ENDPOINT = '/api/exchange-rates';
  private useRealAPI = true; // Toggle to use real API vs mock

  constructor() {
    // Log which mode we're in
    if (this.useBackend) {
      console.log('🚀 CurrencyService: Using BACKEND API at', import.meta.env.VITE_API_URL);
    } else {
      console.log('📦 CurrencyService: Using DIRECT Supabase calls');
    }
    
    // Test conversion rates on initialization
    this.testConversionRates();
  }

  private async testConversionRates() {
    try {
      const testCurrencies: Currency[] = ['MXN', 'COP', 'EUR', 'GBP'];
      
      for (const currency of testCurrencies) {
        const converted = await this.convert(1, 'USD', currency);
      }
    } catch (error) {
      console.error('❌ Failed to test conversion rates:', error);
    }
  }
  // Get primary currency from settings
  getPrimaryCurrency(): Currency {
    const settings = StorageService.getSettings();
    return settings.primaryCurrency || 'USD';
  }

  // Set primary currency
  setPrimaryCurrency(currency: Currency): void {
    const settings = StorageService.getSettings();
    settings.primaryCurrency = currency;
    StorageService.saveSettings(settings);
  }

  // Get exchange rate between two currencies (sync version for backward compatibility)
  getExchangeRate(from: Currency, to: Currency): number {
    if (from === to) return 1;
    const key = `${from}_${to}`;
    
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.rate;
    }
    
    // Fallback to mock rates
    return MOCK_EXCHANGE_RATES[key] || 1;
  }

  // Get exchange rate with real API (async version)
  async getExchangeRateAsync(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;
    
    if (this.useBackend) {
      try {
        return await this.getExchangeRateFromBackend(from, to);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to direct implementation:', error);
        return await this.getExchangeRateAsyncDirect(from, to);
      }
    }
    
    return await this.getExchangeRateAsyncDirect(from, to);
  }

  // Backend API implementation
  private async getExchangeRateFromBackend(from: Currency, to: Currency): Promise<number> {
    const response = await apiClient.get<{ from: string; to: string; rate: number; cachedAt: string }>(
      `/api/currency/rates?from=${from}&to=${to}`
    );
    return response.rate;
  }

  // Direct implementation (fallback)
  private async getExchangeRateAsyncDirect(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;
    
    if (!this.useRealAPI) {
      return this.getExchangeRate(from, to);
    }

    const cacheKey = `${from}_${to}`;

    // 1. Check local cache first (fastest)
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.rate;
    }

    // 2. Check database (fast, shared across devices)
    try {
      const dbRate = await this.getFromDatabase(from, to);
      if (dbRate) {
        // Cache it locally
        this.cache.set(cacheKey, {
          rate: dbRate,
          timestamp: Date.now(),
        });
        return dbRate;
      }
    } catch (err) {
      console.warn('[Currency] DB lookup failed:', err);
    }

    // 3. Fetch from API (slowest, updates DB)
    try {
      const rate = await this.fetchFromAPI(from, to);
      
      // Save to database
      await this.saveToDatabase(from, to, rate);
      
      // Cache locally
      this.cache.set(cacheKey, {
        rate,
        timestamp: Date.now(),
      });
      
      return rate;
    } catch (err) {
      console.warn(`💱 Currency API unavailable for ${from}→${to}, using mock rate`, err);
      // Fallback to mock
      return this.getExchangeRate(from, to);
    }
  }

  // Get rate from database
  private async getFromDatabase(from: string, to: string): Promise<number | null> {
    const id = `${from}_${to}`;
    
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Check if rate is stale (> 24 hours old)
      const lastUpdated = new Date(data.last_updated).getTime();
      const now = Date.now();
      const ageHours = Math.round((now - lastUpdated) / 1000 / 60 / 60);
      
      if (now - lastUpdated > this.CACHE_DURATION) {
        if (ageHours > 24) {
          console.warn(`💱 Exchange rate ${from}→${to} is stale (${ageHours}h old), fetching fresh rate`);
        }
        return null;
      }

      return parseFloat(data.rate);
    } catch (err) {
      console.error('[Currency] Database error:', err);
      return null;
    }
  }

  // Save rate to database
  private async saveToDatabase(from: string, to: string, rate: number): Promise<void> {
    const id = `${from}_${to}`;
    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('exchange_rates')
        .upsert({
          id,
          base_currency: from,
          target_currency: to,
          rate: rate.toString(),
          last_updated: now,
          created_at: now,
        }, {
          onConflict: 'id',
        });

      if (error) throw error;
    } catch (err) {
      console.error('[Currency] Failed to save to database:', err);
    }
  }

  // Fetch rate from API
  private async fetchFromAPI(from: string, to: string): Promise<number> {
    // Exchange API supports all currencies as base
    const url = `${this.API_ENDPOINT}?base=${from}&currencies=${to}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.rates || !data.rates[to]) {
      throw new Error(`No rate found for ${from} -> ${to}`);
    }

    return data.rates[to];
  }

  // Convert amount from one currency to another
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

  // Test method - call from console to verify API works
  async testAPI(): Promise<void> {
    
    try {
      // Clear local cache
      this.cache.clear();
      
      // Test fetching USD -> MXN (will hit API since cache is cleared)
      const usdMxnRate = await this.fetchFromAPI('USD', 'MXN');
      
      // Test fetching USD -> COP
      const usdCopRate = await this.fetchFromAPI('USD', 'COP');
      
      // Now test the full flow with caching
      const cachedMxn = await this.getExchangeRateAsync('USD', 'MXN');
      const cachedCop = await this.getExchangeRateAsync('USD', 'COP');
      
      // Test conversions
      const usdToMxn = await this.convert(100, 'USD', 'MXN');
      
      const usdToCop = await this.convert(100, 'USD', 'COP');
      
    } catch (err) {
      console.error('❌ Test failed:', err);
    }
  }

  // Convert amount using async API
  async convert(amount: number, from: Currency, to: Currency): Promise<number> {
    // Validate inputs
    if (!amount || !from || !to) {
      console.warn('⚠️ Invalid convert parameters:', { amount, from, to });
      return amount || 0;
    }
    
    if (this.useBackend) {
      try {
        return await this.convertFromBackend(amount, from, to);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to direct implementation:', error);
        return await this.convertDirect(amount, from, to);
      }
    }
    
    return await this.convertDirect(amount, from, to);
  }

  // Backend API implementation
  private async convertFromBackend(amount: number, from: Currency, to: Currency): Promise<number> {
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

  // Direct implementation (fallback)
  private async convertDirect(amount: number, from: Currency, to: Currency): Promise<number> {
    const rate = await this.getExchangeRateAsync(from, to);
    return amount * rate;
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cache.clear();
  }
}

export const currencyService = new CurrencyService();

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).testCurrencyAPI = () => currencyService.testAPI();
  (window as any).clearCurrencyCache = () => currencyService.clearCache();
}

