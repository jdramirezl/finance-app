/**
 * ExchangeRate Value Object Unit Tests
 */

import { ExchangeRate } from './ExchangeRate';
import type { Currency } from '@shared-backend/types';

describe('ExchangeRate Value Object', () => {
  describe('Constructor and Validation', () => {
    it('should create a valid exchange rate', () => {
      const cachedAt = new Date('2024-01-01T12:00:00Z');
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      expect(rate.fromCurrency).toBe('USD');
      expect(rate.toCurrency).toBe('MXN');
      expect(rate.rate).toBe(20.5);
      expect(rate.cachedAt).toBe(cachedAt);
    });

    it('should throw error for invalid from currency', () => {
      const cachedAt = new Date();
      
      expect(() => new ExchangeRate('INVALID' as Currency, 'USD', 1.0, cachedAt))
        .toThrow('Invalid from currency - must be one of: USD, MXN, COP, EUR, GBP');
    });

    it('should throw error for invalid to currency', () => {
      const cachedAt = new Date();
      
      expect(() => new ExchangeRate('USD', 'INVALID' as Currency, 1.0, cachedAt))
        .toThrow('Invalid to currency - must be one of: USD, MXN, COP, EUR, GBP');
    });

    it('should throw error for non-numeric rate', () => {
      const cachedAt = new Date();
      
      expect(() => new ExchangeRate('USD', 'MXN', NaN, cachedAt))
        .toThrow('Exchange rate must be a valid number');
    });

    it('should throw error for zero rate', () => {
      const cachedAt = new Date();
      
      expect(() => new ExchangeRate('USD', 'MXN', 0, cachedAt))
        .toThrow('Exchange rate must be positive');
    });

    it('should throw error for negative rate', () => {
      const cachedAt = new Date();
      
      expect(() => new ExchangeRate('USD', 'MXN', -1.5, cachedAt))
        .toThrow('Exchange rate must be positive');
    });

    it('should throw error for invalid date', () => {
      expect(() => new ExchangeRate('USD', 'MXN', 20.5, new Date('invalid')))
        .toThrow('Cached at must be a valid Date');
    });

    it('should accept all valid currency pairs', () => {
      const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
      const cachedAt = new Date();
      
      currencies.forEach(from => {
        currencies.forEach(to => {
          const rate = new ExchangeRate(from, to, 1.5, cachedAt);
          expect(rate.fromCurrency).toBe(from);
          expect(rate.toCurrency).toBe(to);
        });
      });
    });
  });

  describe('isExpired', () => {
    it('should return false for recently cached rate', () => {
      const cachedAt = new Date(); // Now
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      expect(rate.isExpired()).toBe(false);
    });

    it('should return false for rate cached 23 hours ago', () => {
      const cachedAt = new Date();
      cachedAt.setHours(cachedAt.getHours() - 23);
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      expect(rate.isExpired()).toBe(false);
    });

    it('should return true for rate cached exactly 24 hours ago', () => {
      const cachedAt = new Date();
      cachedAt.setHours(cachedAt.getHours() - 24);
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      expect(rate.isExpired()).toBe(true);
    });

    it('should return true for rate cached 25 hours ago', () => {
      const cachedAt = new Date();
      cachedAt.setHours(cachedAt.getHours() - 25);
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      expect(rate.isExpired()).toBe(true);
    });

    it('should return true for rate cached 48 hours ago', () => {
      const cachedAt = new Date();
      cachedAt.setHours(cachedAt.getHours() - 48);
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      expect(rate.isExpired()).toBe(true);
    });
  });

  describe('isValid', () => {
    it('should return true for recently cached rate', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      expect(rate.isValid()).toBe(true);
    });

    it('should return false for expired rate', () => {
      const cachedAt = new Date();
      cachedAt.setHours(cachedAt.getHours() - 25);
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      expect(rate.isValid()).toBe(false);
    });
  });

  describe('getAge', () => {
    it('should return age in milliseconds', () => {
      const cachedAt = new Date();
      cachedAt.setHours(cachedAt.getHours() - 2); // 2 hours ago
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      const age = rate.getAge();
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      
      // Allow small tolerance for test execution time
      expect(age).toBeGreaterThanOrEqual(twoHoursInMs - 1000);
      expect(age).toBeLessThanOrEqual(twoHoursInMs + 1000);
    });

    it('should return near zero for just cached rate', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      const age = rate.getAge();
      
      expect(age).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('getAgeInHours', () => {
    it('should return age in hours', () => {
      const cachedAt = new Date();
      cachedAt.setHours(cachedAt.getHours() - 5); // 5 hours ago
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      const ageInHours = rate.getAgeInHours();
      
      expect(ageInHours).toBeGreaterThanOrEqual(4.99);
      expect(ageInHours).toBeLessThanOrEqual(5.01);
    });

    it('should return near zero for just cached rate', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      const ageInHours = rate.getAgeInHours();
      
      expect(ageInHours).toBeLessThan(0.001); // Less than 0.001 hours
    });
  });

  describe('convert', () => {
    it('should convert amount using rate', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      const converted = rate.convert(100);
      
      expect(converted).toBe(2000);
    });

    it('should handle decimal amounts', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'EUR', 0.85, cachedAt);
      
      const converted = rate.convert(100.50);
      
      expect(converted).toBeCloseTo(85.425, 2);
    });

    it('should handle zero amount', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      const converted = rate.convert(0);
      
      expect(converted).toBe(0);
    });

    it('should throw error for negative amount', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      expect(() => rate.convert(-100))
        .toThrow('Amount cannot be negative');
    });

    it('should throw error for NaN amount', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      expect(() => rate.convert(NaN))
        .toThrow('Amount must be a valid number');
    });
  });

  describe('inverse', () => {
    it('should create inverse exchange rate', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      const inverse = rate.inverse();
      
      expect(inverse.fromCurrency).toBe('MXN');
      expect(inverse.toCurrency).toBe('USD');
      expect(inverse.rate).toBe(0.05);
      expect(inverse.cachedAt).toBe(cachedAt);
    });

    it('should maintain cachedAt date', () => {
      const cachedAt = new Date('2024-01-01T12:00:00Z');
      const rate = new ExchangeRate('USD', 'EUR', 0.85, cachedAt);
      
      const inverse = rate.inverse();
      
      expect(inverse.cachedAt).toBe(cachedAt);
    });

    it('should create valid inverse for decimal rates', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'EUR', 0.85, cachedAt);
      
      const inverse = rate.inverse();
      
      expect(inverse.rate).toBeCloseTo(1.176, 3);
    });
  });

  describe('matches', () => {
    it('should return true for matching currency pair', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      expect(rate.matches('USD', 'MXN')).toBe(true);
    });

    it('should return false for reversed currency pair', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      expect(rate.matches('MXN', 'USD')).toBe(false);
    });

    it('should return false for different currency pair', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      expect(rate.matches('USD', 'EUR')).toBe(false);
    });

    it('should return false for completely different pair', () => {
      const cachedAt = new Date();
      const rate = new ExchangeRate('USD', 'MXN', 20.0, cachedAt);
      
      expect(rate.matches('EUR', 'GBP')).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize to plain object', () => {
      const cachedAt = new Date('2024-01-01T12:00:00Z');
      const rate = new ExchangeRate('USD', 'MXN', 20.5, cachedAt);
      
      const json = rate.toJSON();
      
      expect(json).toEqual({
        fromCurrency: 'USD',
        toCurrency: 'MXN',
        rate: 20.5,
        cachedAt: '2024-01-01T12:00:00.000Z',
      });
    });
  });

  describe('fromJSON', () => {
    it('should deserialize from plain object with string date', () => {
      const json = {
        fromCurrency: 'USD' as Currency,
        toCurrency: 'MXN' as Currency,
        rate: 20.5,
        cachedAt: '2024-01-01T12:00:00.000Z',
      };
      
      const rate = ExchangeRate.fromJSON(json);
      
      expect(rate.fromCurrency).toBe('USD');
      expect(rate.toCurrency).toBe('MXN');
      expect(rate.rate).toBe(20.5);
      expect(rate.cachedAt).toEqual(new Date('2024-01-01T12:00:00.000Z'));
    });

    it('should deserialize from plain object with Date object', () => {
      const cachedAt = new Date('2024-01-01T12:00:00Z');
      const json = {
        fromCurrency: 'USD' as Currency,
        toCurrency: 'MXN' as Currency,
        rate: 20.5,
        cachedAt: cachedAt,
      };
      
      const rate = ExchangeRate.fromJSON(json);
      
      expect(rate.cachedAt).toBe(cachedAt);
    });

    it('should round-trip through JSON', () => {
      const original = new ExchangeRate('USD', 'EUR', 0.85, new Date('2024-01-01T12:00:00Z'));
      
      const json = original.toJSON();
      const restored = ExchangeRate.fromJSON(json);
      
      expect(restored.fromCurrency).toBe(original.fromCurrency);
      expect(restored.toCurrency).toBe(original.toCurrency);
      expect(restored.rate).toBe(original.rate);
      expect(restored.cachedAt.getTime()).toBe(original.cachedAt.getTime());
    });
  });
});
