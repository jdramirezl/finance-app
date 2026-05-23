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
      
      expect(json).toMatchObject({
        id: 'settings-1',
        userId: 'user-1',
        primaryCurrency: 'USD',
        alphaVantageApiKey: 'api-key',
        dateFormat: 'MMM d, yyyy',
        movementsPerPage: 50,
        reminderAdvanceDays: 7,
        defaultCurrencyForNewAccounts: 'USD',
      });
    });

    it('should serialize without API key', () => {
      const settings = new Settings('settings-1', 'user-1', 'EUR');
      
      const json = settings.toJSON();
      
      expect(json).toMatchObject({
        id: 'settings-1',
        userId: 'user-1',
        primaryCurrency: 'EUR',
        alphaVantageApiKey: undefined,
      });
    });
  });

  describe('dateFormat', () => {
    it('should default to MMM d, yyyy', () => {
      const settings = new Settings('s-1', 'u-1', 'USD');
      expect(settings.dateFormat).toBe('MMM d, yyyy');
    });

    it('should accept valid date formats', () => {
      const formats = ['MMM d, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'] as const;
      formats.forEach(fmt => {
        const settings = new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, fmt);
        expect(settings.dateFormat).toBe(fmt);
      });
    });

    it('should reject invalid date format', () => {
      expect(() => new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'INVALID' as any))
        .toThrow('Invalid date format');
    });

    it('should update date format', () => {
      const settings = new Settings('s-1', 'u-1', 'USD');
      settings.updateDateFormat('yyyy-MM-dd');
      expect(settings.dateFormat).toBe('yyyy-MM-dd');
    });
  });

  describe('movementsPerPage', () => {
    it('should default to 50', () => {
      const settings = new Settings('s-1', 'u-1', 'USD');
      expect(settings.movementsPerPage).toBe(50);
    });

    it('should reject values below 10', () => {
      expect(() => new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'MMM d, yyyy', 5))
        .toThrow('Movements per page must be between 10 and 200');
    });

    it('should reject values above 200', () => {
      expect(() => new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'MMM d, yyyy', 201))
        .toThrow('Movements per page must be between 10 and 200');
    });

    it('should accept boundary values', () => {
      const s10 = new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'MMM d, yyyy', 10);
      expect(s10.movementsPerPage).toBe(10);
      const s200 = new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'MMM d, yyyy', 200);
      expect(s200.movementsPerPage).toBe(200);
    });

    it('should update movementsPerPage', () => {
      const settings = new Settings('s-1', 'u-1', 'USD');
      settings.updateMovementsPerPage(100);
      expect(settings.movementsPerPage).toBe(100);
    });
  });

  describe('reminderAdvanceDays', () => {
    it('should default to 7', () => {
      const settings = new Settings('s-1', 'u-1', 'USD');
      expect(settings.reminderAdvanceDays).toBe(7);
    });

    it('should reject values below 1', () => {
      expect(() => new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'MMM d, yyyy', 50, 0))
        .toThrow('Reminder advance days must be between 1 and 30');
    });

    it('should reject values above 30', () => {
      expect(() => new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'MMM d, yyyy', 50, 31))
        .toThrow('Reminder advance days must be between 1 and 30');
    });

    it('should update reminderAdvanceDays', () => {
      const settings = new Settings('s-1', 'u-1', 'USD');
      settings.updateReminderAdvanceDays(14);
      expect(settings.reminderAdvanceDays).toBe(14);
    });
  });

  describe('defaultCurrencyForNewAccounts', () => {
    it('should default to USD', () => {
      const settings = new Settings('s-1', 'u-1', 'USD');
      expect(settings.defaultCurrencyForNewAccounts).toBe('USD');
    });

    it('should reject invalid currency', () => {
      expect(() => new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'MMM d, yyyy', 50, 7, 'INVALID' as any))
        .toThrow('Invalid default currency for new accounts');
    });

    it('should accept all valid currencies', () => {
      const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
      currencies.forEach(c => {
        const settings = new Settings('s-1', 'u-1', 'USD', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'MMM d, yyyy', 50, 7, c);
        expect(settings.defaultCurrencyForNewAccounts).toBe(c);
      });
    });

    it('should update defaultCurrencyForNewAccounts', () => {
      const settings = new Settings('s-1', 'u-1', 'USD');
      settings.updateDefaultCurrencyForNewAccounts('EUR');
      expect(settings.defaultCurrencyForNewAccounts).toBe('EUR');
    });
  });
});
