/**
 * Settings Entity Unit Tests
 */

import { Settings } from './Settings';
import type { Currency } from '@shared-backend/types';

describe('Settings Entity', () => {
  describe('Constructor and Validation', () => {
    it('should create a valid settings instance', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD');
      
      expect(settings.id).toBe('settings-1');
      expect(settings.userId).toBe('user-1');
      expect(settings.primaryCurrency).toBe('USD');
      expect(settings.alphaVantageApiKey).toBeUndefined();
    });

    it('should create settings with API key', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD', 'test-api-key');
      
      expect(settings.alphaVantageApiKey).toBe('test-api-key');
    });

    it('should throw error if userId is empty', () => {
      expect(() => new Settings('settings-1', '', 'USD'))
        .toThrow('User ID cannot be empty');
    });

    it('should throw error if userId is whitespace', () => {
      expect(() => new Settings('settings-1', '   ', 'USD'))
        .toThrow('User ID cannot be empty');
    });

    it('should throw error for invalid currency', () => {
      expect(() => new Settings('settings-1', 'user-1', 'INVALID' as Currency))
        .toThrow('Invalid primary currency - must be one of: USD, MXN, COP, EUR, GBP');
    });

    it('should throw error if API key is empty string', () => {
      expect(() => new Settings('settings-1', 'user-1', 'USD', ''))
        .toThrow('Alpha Vantage API key cannot be empty string');
    });

    it('should throw error if API key is whitespace', () => {
      expect(() => new Settings('settings-1', 'user-1', 'USD', '   '))
        .toThrow('Alpha Vantage API key cannot be empty string');
    });

    it('should accept all valid currencies', () => {
      const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
      
      currencies.forEach(currency => {
        const settings = new Settings('settings-1', 'user-1', currency);
        expect(settings.primaryCurrency).toBe(currency);
      });
    });
  });

  describe('updatePrimaryCurrency', () => {
    it('should update primary currency', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD');
      
      settings.updatePrimaryCurrency('EUR');
      
      expect(settings.primaryCurrency).toBe('EUR');
    });

    it('should throw error for invalid currency', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD');
      
      expect(() => settings.updatePrimaryCurrency('INVALID' as Currency))
        .toThrow('Invalid primary currency');
    });

    it('should allow updating to same currency', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD');
      
      settings.updatePrimaryCurrency('USD');
      
      expect(settings.primaryCurrency).toBe('USD');
    });
  });

  describe('updateAlphaVantageApiKey', () => {
    it('should update API key', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD');
      
      settings.updateAlphaVantageApiKey('new-api-key');
      
      expect(settings.alphaVantageApiKey).toBe('new-api-key');
    });

    it('should clear API key when undefined', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD', 'old-key');
      
      settings.updateAlphaVantageApiKey(undefined);
      
      expect(settings.alphaVantageApiKey).toBeUndefined();
    });

    it('should throw error for empty string', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD');
      
      expect(() => settings.updateAlphaVantageApiKey(''))
        .toThrow('Alpha Vantage API key cannot be empty string');
    });

    it('should throw error for whitespace', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD');
      
      expect(() => settings.updateAlphaVantageApiKey('   '))
        .toThrow('Alpha Vantage API key cannot be empty string');
    });
  });

  describe('hasAlphaVantageApiKey', () => {
    it('should return false when API key is undefined', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD');
      
      expect(settings.hasAlphaVantageApiKey()).toBe(false);
    });

    it('should return true when API key is set', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD', 'test-key');
      
      expect(settings.hasAlphaVantageApiKey()).toBe(true);
    });

    it('should return false after clearing API key', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD', 'test-key');
      
      settings.updateAlphaVantageApiKey(undefined);
      
      expect(settings.hasAlphaVantageApiKey()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize to plain object', () => {
      const settings = new Settings('settings-1', 'user-1', 'USD', 'api-key');
      
      const json = settings.toJSON();
      
      expect(json).toEqual({
        id: 'settings-1',
        userId: 'user-1',
        primaryCurrency: 'USD',
        alphaVantageApiKey: 'api-key',
      });
    });

    it('should serialize without API key', () => {
      const settings = new Settings('settings-1', 'user-1', 'EUR');
      
      const json = settings.toJSON();
      
      expect(json).toEqual({
        id: 'settings-1',
        userId: 'user-1',
        primaryCurrency: 'EUR',
        alphaVantageApiKey: undefined,
      });
    });
  });
});
