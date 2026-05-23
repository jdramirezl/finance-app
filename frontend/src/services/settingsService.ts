import type { Settings } from '../types';
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
} from '../constants';
import { apiClient } from './apiClient';

class SettingsService {
  // Get user settings
  async getSettings(): Promise<Settings> {
    return await apiClient.get<Settings>('/api/settings');
  }

  // Update user settings
  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    // Validate primary currency client-side before hitting the backend
    if (updates.primaryCurrency && !isSupportedCurrency(updates.primaryCurrency)) {
      throw new Error(
        `Invalid currency: ${updates.primaryCurrency}. Must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`
      );
    }

    return await apiClient.put<Settings>('/api/settings', updates);
  }

  // Get primary currency (convenience method)
  async getPrimaryCurrency() {
    const settings = await this.getSettings();
    return settings.primaryCurrency || DEFAULT_CURRENCY;
  }

  // Set primary currency (convenience method)
  async setPrimaryCurrency(currency: Settings['primaryCurrency']) {
    return await this.updateSettings({ primaryCurrency: currency });
  }

  // Get Alpha Vantage API key (convenience method)
  async getAlphaVantageApiKey() {
    const settings = await this.getSettings();
    return settings.alphaVantageApiKey;
  }

  // Set Alpha Vantage API key (convenience method)
  async setAlphaVantageApiKey(apiKey: string) {
    return await this.updateSettings({ alphaVantageApiKey: apiKey });
  }

  // Get account card display settings (convenience method)
  async getAccountCardDisplaySettings() {
    const settings = await this.getSettings();
    return settings.accountCardDisplay || {
      normal: 'detailed',
      investment: 'detailed',
      cd: 'detailed'
    };
  }

  // Set account card display settings (convenience method)
  async setAccountCardDisplaySettings(accountCardDisplay: Settings['accountCardDisplay']) {
    return await this.updateSettings({ accountCardDisplay });
  }

  // Set display mode for specific account type (convenience method)
  async setAccountTypeDisplayMode(accountType: 'normal' | 'investment' | 'cd', mode: 'compact' | 'detailed') {
    const currentSettings = await this.getAccountCardDisplaySettings();
    const updatedSettings = {
      ...currentSettings,
      [accountType]: mode
    };
    return await this.setAccountCardDisplaySettings(updatedSettings);
  }
}

export const settingsService = new SettingsService();
