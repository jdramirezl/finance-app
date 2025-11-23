import type { Currency } from '../types';
import { StorageService } from './storageService';

// Mock exchange rates (will be replaced with real API later)
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

class CurrencyService {
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

  // Get exchange rate between two currencies
  getExchangeRate(from: Currency, to: Currency): number {
    if (from === to) return 1;
    const key = `${from}_${to}`;
    return MOCK_EXCHANGE_RATES[key] || 1;
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
}

export const currencyService = new CurrencyService();

