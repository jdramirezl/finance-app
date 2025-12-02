/**
 * Unit tests for StockPrice value object
 */

import { StockPrice } from './StockPrice';

describe('StockPrice Value Object', () => {
  describe('Construction and Validation', () => {
    it('should create a valid stock price', () => {
      const cachedAt = new Date();
      const stockPrice = new StockPrice('VOO', 450.25, cachedAt);

      expect(stockPrice.symbol).toBe('VOO');
      expect(stockPrice.price).toBe(450.25);
      expect(stockPrice.cachedAt).toBe(cachedAt);
    });

    it('should reject empty symbol', () => {
      expect(() => new StockPrice('', 100, new Date()))
        .toThrow('Stock symbol cannot be empty');
    });

    it('should reject symbol with invalid format', () => {
      expect(() => new StockPrice('voo', 100, new Date()))
        .toThrow('Stock symbol must be 1-5 uppercase letters');

      expect(() => new StockPrice('VOO123', 100, new Date()))
        .toThrow('Stock symbol must be 1-5 uppercase letters');

      expect(() => new StockPrice('TOOLONG', 100, new Date()))
        .toThrow('Stock symbol must be 1-5 uppercase letters');
    });

    it('should accept valid symbol formats', () => {
      expect(() => new StockPrice('V', 100, new Date())).not.toThrow();
      expect(() => new StockPrice('VOO', 100, new Date())).not.toThrow();
      expect(() => new StockPrice('AAPL', 100, new Date())).not.toThrow();
      expect(() => new StockPrice('GOOGL', 100, new Date())).not.toThrow();
    });

    it('should reject negative price', () => {
      expect(() => new StockPrice('VOO', -10, new Date()))
        .toThrow('Stock price cannot be negative');
    });

    it('should reject NaN price', () => {
      expect(() => new StockPrice('VOO', NaN, new Date()))
        .toThrow('Stock price must be a valid number');
    });

    it('should accept zero price', () => {
      expect(() => new StockPrice('VOO', 0, new Date())).not.toThrow();
    });

    it('should reject invalid date', () => {
      expect(() => new StockPrice('VOO', 100, new Date('invalid')))
        .toThrow('Cached date must be a valid Date');
    });
  });

  describe('Cache Expiration', () => {
    it('should not be expired for recent cache', () => {
      const recentDate = new Date();
      const stockPrice = new StockPrice('VOO', 450.25, recentDate);

      expect(stockPrice.isExpired()).toBe(false);
      expect(stockPrice.isFresh()).toBe(true);
    });

    it('should be expired for cache older than 24 hours', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago
      const stockPrice = new StockPrice('VOO', 450.25, oldDate);

      expect(stockPrice.isExpired()).toBe(true);
      expect(stockPrice.isFresh()).toBe(false);
    });

    it('should not be expired at exactly 24 hours', () => {
      const exactDate = new Date();
      exactDate.setHours(exactDate.getHours() - 24);
      const stockPrice = new StockPrice('VOO', 450.25, exactDate);

      expect(stockPrice.isExpired()).toBe(false);
      expect(stockPrice.isFresh()).toBe(true);
    });

    it('should calculate age in hours correctly', () => {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      const stockPrice = new StockPrice('VOO', 450.25, twoHoursAgo);

      const age = stockPrice.getAgeInHours();
      expect(age).toBeGreaterThanOrEqual(2);
      expect(age).toBeLessThan(2.1); // Allow small margin for test execution time
    });
  });

  describe('Immutability and Updates', () => {
    it('should create new instance with updated price', () => {
      const originalDate = new Date('2024-01-01');
      const original = new StockPrice('VOO', 450.25, originalDate);

      const updated = original.withUpdatedPrice(455.50);

      // Original should be unchanged
      expect(original.price).toBe(450.25);
      expect(original.cachedAt).toBe(originalDate);

      // Updated should have new price and new date
      expect(updated.price).toBe(455.50);
      expect(updated.cachedAt).not.toBe(originalDate);
      expect(updated.cachedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const cachedAt = new Date('2024-01-15T10:30:00Z');
      const stockPrice = new StockPrice('VOO', 450.25, cachedAt);

      const json = stockPrice.toJSON();

      expect(json).toEqual({
        symbol: 'VOO',
        price: 450.25,
        cachedAt: '2024-01-15T10:30:00.000Z',
      });
    });

    it('should deserialize from JSON', () => {
      const json = {
        symbol: 'AAPL',
        price: 180.50,
        cachedAt: '2024-01-15T10:30:00.000Z',
      };

      const stockPrice = StockPrice.fromJSON(json);

      expect(stockPrice.symbol).toBe('AAPL');
      expect(stockPrice.price).toBe(180.50);
      expect(stockPrice.cachedAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should round-trip through JSON', () => {
      const original = new StockPrice('VOO', 450.25, new Date('2024-01-15T10:30:00Z'));
      const json = original.toJSON();
      const restored = StockPrice.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('Equality', () => {
    it('should be equal for same values', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const price1 = new StockPrice('VOO', 450.25, date);
      const price2 = new StockPrice('VOO', 450.25, date);

      expect(price1.equals(price2)).toBe(true);
    });

    it('should not be equal for different symbols', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const price1 = new StockPrice('VOO', 450.25, date);
      const price2 = new StockPrice('AAPL', 450.25, date);

      expect(price1.equals(price2)).toBe(false);
    });

    it('should not be equal for different prices', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const price1 = new StockPrice('VOO', 450.25, date);
      const price2 = new StockPrice('VOO', 455.50, date);

      expect(price1.equals(price2)).toBe(false);
    });

    it('should not be equal for different dates', () => {
      const date1 = new Date('2024-01-15T10:30:00Z');
      const date2 = new Date('2024-01-15T11:30:00Z');
      const price1 = new StockPrice('VOO', 450.25, date1);
      const price2 = new StockPrice('VOO', 450.25, date2);

      expect(price1.equals(price2)).toBe(false);
    });
  });
});
