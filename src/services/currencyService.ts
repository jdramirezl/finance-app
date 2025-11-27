import type { Currency } from '../types';
import { StorageService } from './storageService';
import { supabase } from '../lib/supabase';

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
  private cache: Map<string, CachedRate> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
  private readonly API_ENDPOINT = '/api/exchange-rates';
  private useRealAPI = true; // Toggle to use real API vs mock
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
    
    if (!this.useRealAPI) {
      return this.getExchangeRate(from, to);
    }

    const cacheKey = `${from}_${to}`;

    // 1. Check local cache first (fastest)
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[Currency] Using cached rate: ${from} -> ${to} = ${cached.rate}`);
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
        console.log(`[Currency] Using DB rate: ${from} -> ${to} = ${dbRate}`);
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
      
      console.log(`[Currency] Fetched from API: ${from} -> ${to} = ${rate}`);
      return rate;
    } catch (err) {
      console.error('[Currency] API fetch failed, using mock rate:', err);
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
      if (now - lastUpdated > this.CACHE_DURATION) {
        console.log(`[Currency] DB rate is stale (${Math.round((now - lastUpdated) / 1000 / 60 / 60)}h old)`);
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
      console.log(`[Currency] Saved to DB: ${from} -> ${to} = ${rate}`);
    } catch (err) {
      console.error('[Currency] Failed to save to database:', err);
    }
  }

  // Fetch rate from API
  private async fetchFromAPI(from: string, to: string): Promise<number> {
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
    console.log('🧪 Testing Currency API...');
    console.log('useRealAPI:', this.useRealAPI);
    
    try {
      // Test fetching USD -> MXN
      console.log('\n1️⃣ Testing USD -> MXN...');
      const usdMxnRate = await this.getExchangeRateAsync('USD', 'MXN');
      console.log('✅ Rate:', usdMxnRate);
      
      // Test fetching COP -> MXN
      console.log('\n2️⃣ Testing COP -> MXN...');
      const copMxnRate = await this.getExchangeRateAsync('COP', 'MXN');
      console.log('✅ Rate:', copMxnRate);
      
      // Check cache
      console.log('\n3️⃣ Checking cache...');
      const cachedUsd = this.cache.get('USD_MXN');
      const cachedCop = this.cache.get('COP_MXN');
      console.log('USD_MXN cache:', cachedUsd);
      console.log('COP_MXN cache:', cachedCop);
      
      // Test conversions
      console.log('\n4️⃣ Testing conversions...');
      const usdConverted = await this.convert(100, 'USD', 'MXN');
      console.log('100 USD =', usdConverted.toFixed(2), 'MXN');
      
      const copConverted = await this.convert(1000000, 'COP', 'MXN');
      console.log('1,000,000 COP =', copConverted.toFixed(2), 'MXN');
      
      console.log('\n✅ All tests passed!');
    } catch (err) {
      console.error('❌ Test failed:', err);
    }
  }

  // Convert amount using async API
  async convert(amount: number, from: Currency, to: Currency): Promise<number> {
    const rate = await this.getExchangeRateAsync(from, to);
    return amount * rate;
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cache.clear();
    console.log('[Currency] Cache cleared');
  }
}

export const currencyService = new CurrencyService();

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).testCurrencyAPI = () => currencyService.testAPI();
  (window as any).clearCurrencyCache = () => currencyService.clearCache();
}

