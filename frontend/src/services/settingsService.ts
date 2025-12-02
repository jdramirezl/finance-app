import type { Settings } from '../types';
import { StorageService } from './storageService';
import { SupabaseStorageService } from './supabaseStorageService';
import { apiClient } from './apiClient';

class SettingsService {
  // Feature flag to control backend usage
  private useBackend = import.meta.env.VITE_USE_BACKEND_SETTINGS === 'true';

  constructor() {
    // Log which mode we're in
    if (this.useBackend) {
      console.log('🚀 SettingsService: Using BACKEND API at', import.meta.env.VITE_API_URL);
    } else {
      console.log('📦 SettingsService: Using DIRECT Supabase calls');
    }
  }

  // Get user settings
  async getSettings(): Promise<Settings> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: GET /api/settings');
        return await apiClient.get<Settings>('/api/settings');
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.getSettingsDirect();
      }
    }
    return await this.getSettingsDirect();
  }

  // Direct Supabase implementation (fallback)
  private async getSettingsDirect(): Promise<Settings> {
    // Try Supabase first
    const supabaseSettings = await SupabaseStorageService.getSettings();
    if (supabaseSettings) {
      return supabaseSettings;
    }
    
    // Fallback to localStorage
    return StorageService.getSettings();
  }

  // Update user settings
  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: PUT /api/settings', updates);
        return await apiClient.put<Settings>('/api/settings', updates);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.updateSettingsDirect(updates);
      }
    }
    return await this.updateSettingsDirect(updates);
  }

  // Direct Supabase implementation (fallback)
  private async updateSettingsDirect(updates: Partial<Settings>): Promise<Settings> {
    // Get current settings
    const currentSettings = await this.getSettingsDirect();
    
    // Merge updates
    const updatedSettings: Settings = {
      ...currentSettings,
      ...updates,
    };

    // Validate primary currency if provided
    if (updates.primaryCurrency) {
      const validCurrencies = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
      if (!validCurrencies.includes(updates.primaryCurrency)) {
        throw new Error(`Invalid currency: ${updates.primaryCurrency}. Must be one of: ${validCurrencies.join(', ')}`);
      }
    }

    // Save to Supabase
    await SupabaseStorageService.saveSettings(updatedSettings);
    
    // Also save to localStorage for offline access
    StorageService.saveSettings(updatedSettings);

    return updatedSettings;
  }

  // Get primary currency (convenience method)
  async getPrimaryCurrency() {
    const settings = await this.getSettings();
    return settings.primaryCurrency || 'USD';
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
}

export const settingsService = new SettingsService();
