/**
 * Integration Tests for SupabaseExchangeRateRepository
 * 
 * These tests interact with a real Supabase database to verify repository operations.
 * They test the actual database interactions, not mocked behavior.
 * 
 * Prerequisites:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment
 * - Database must have the exchange_rates table with proper schema
 */

import 'reflect-metadata';
import { SupabaseExchangeRateRepository } from './SupabaseExchangeRateRepository';
import { ExchangeRate } from '../domain/ExchangeRate';
import { DatabaseError } from '../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';
import { createClient } from '@supabase/supabase-js';

// Skip integration tests by default (they require real database)
// To run these tests, set RUN_INTEGRATION_TESTS=true in addition to Supabase credentials
const describeIntegration = 
  process.env.RUN_INTEGRATION_TESTS === 'true' && 
  process.env.SUPABASE_URL && 
  process.env.SUPABASE_SERVICE_KEY
    ? describe
    : describe.skip;

describeIntegration('SupabaseExchangeRateRepository Integration Tests', () => {
  let repository: SupabaseExchangeRateRepository;
  let supabase: any;

  // Setup: Create repository
  beforeAll(() => {
    repository = new SupabaseExchangeRateRepository();
    
    // Create Supabase client for cleanup
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  });

  // Cleanup: Delete all test data after each test
  afterEach(async () => {
    // Delete all exchange rates (test data)
    await supabase
      .from('exchange_rates')
      .delete()
      .neq('from_currency', ''); // Delete all
  });

  describe('findByCurrencyPair operation', () => {
    it('should return null when exchange rate does not exist', async () => {
      // Act
      const result = await repository.findRate('USD', 'MXN');

      // Assert
      expect(result).toBeNull();
    });

    it('should find exchange rate by currency pair', async () => {
      // Arrange - Create exchange rate first
      const exchangeRate = new ExchangeRate(
        'USD',
        'MXN',
        20.5,
        new Date()
      );
      await repository.saveRate(exchangeRate);

      // Act
      const found = await repository.findRate('USD', 'MXN');

      // Assert
      expect(found).not.toBeNull();
      expect(found?.fromCurrency).toBe('USD');
      expect(found?.toCurrency).toBe('MXN');
      expect(found?.rate).toBe(20.5);
    });

    it('should return null for expired exchange rate (older than 24 hours)', async () => {
      // Arrange - Create exchange rate with old timestamp
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago
      
      const exchangeRate = new ExchangeRate(
        'USD',
        'EUR',
        0.92,
        oldDate
      );
      await repository.saveRate(exchangeRate);

      // Act
      const found = await repository.findRate('USD', 'EUR');

      // Assert - Should return null because it's expired
      expect(found).toBeNull();
    });

    it('should find valid exchange rate (less than 24 hours old)', async () => {
      // Arrange - Create exchange rate with recent timestamp
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 12); // 12 hours ago
      
      const exchangeRate = new ExchangeRate(
        'USD',
        'GBP',
        0.79,
        recentDate
      );
      await repository.saveRate(exchangeRate);

      // Act
      const found = await repository.findRate('USD', 'GBP');

      // Assert - Should find it because it's still valid
      expect(found).not.toBeNull();
      expect(found?.rate).toBe(0.79);
    });
  });

  describe('save operation', () => {
    it('should save new exchange rate to the database', async () => {
      // Arrange
      const exchangeRate = new ExchangeRate(
        'USD',
        'COP',
        4200,
        new Date()
      );

      // Act
      await repository.saveRate(exchangeRate);

      // Assert - Verify exchange rate was saved by fetching it
      const saved = await repository.findRate('USD', 'COP');
      expect(saved).not.toBeNull();
      expect(saved?.fromCurrency).toBe('USD');
      expect(saved?.toCurrency).toBe('COP');
      expect(saved?.rate).toBe(4200);
    });

    it('should update existing exchange rate (upsert)', async () => {
      // Arrange - Create initial exchange rate
      const exchangeRate1 = new ExchangeRate(
        'EUR',
        'USD',
        1.08,
        new Date()
      );
      await repository.saveRate(exchangeRate1);

      // Act - Update with new rate
      const exchangeRate2 = new ExchangeRate(
        'EUR',
        'USD',
        1.10,
        new Date()
      );
      await repository.saveRate(exchangeRate2);

      // Assert - Should have updated, not created new record
      const saved = await repository.findRate('EUR', 'USD');
      expect(saved).not.toBeNull();
      expect(saved?.rate).toBe(1.10);
    });

    it('should save multiple exchange rates for different pairs', async () => {
      // Arrange
      const rate1 = new ExchangeRate('USD', 'MXN', 20.5, new Date());
      const rate2 = new ExchangeRate('USD', 'EUR', 0.92, new Date());
      const rate3 = new ExchangeRate('EUR', 'GBP', 0.86, new Date());

      // Act
      await repository.saveRate(rate1);
      await repository.saveRate(rate2);
      await repository.saveRate(rate3);

      // Assert
      const found1 = await repository.findRate('USD', 'MXN');
      const found2 = await repository.findRate('USD', 'EUR');
      const found3 = await repository.findRate('EUR', 'GBP');

      expect(found1?.rate).toBe(20.5);
      expect(found2?.rate).toBe(0.92);
      expect(found3?.rate).toBe(0.86);
    });
  });

  describe('deleteExpired operation', () => {
    it('should delete expired exchange rates', async () => {
      // Arrange - Create mix of fresh and expired rates
      const freshDate = new Date();
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago

      const freshRate = new ExchangeRate('USD', 'MXN', 20.5, freshDate);
      const expiredRate1 = new ExchangeRate('USD', 'EUR', 0.92, expiredDate);
      const expiredRate2 = new ExchangeRate('EUR', 'GBP', 0.86, expiredDate);

      await repository.saveRate(freshRate);
      await repository.saveRate(expiredRate1);
      await repository.saveRate(expiredRate2);

      // Act
      const deletedCount = await repository.deleteExpired();

      // Assert
      expect(deletedCount).toBe(2); // Should delete 2 expired rates

      // Verify fresh rate still exists
      const stillExists = await repository.findRate('USD', 'MXN');
      expect(stillExists).not.toBeNull();

      // Verify expired rates are gone
      const deleted1 = await repository.findRate('USD', 'EUR');
      const deleted2 = await repository.findRate('EUR', 'GBP');
      expect(deleted1).toBeNull();
      expect(deleted2).toBeNull();
    });

    it('should return 0 when no expired rates exist', async () => {
      // Arrange - Create only fresh rates
      const freshRate = new ExchangeRate('USD', 'MXN', 20.5, new Date());
      await repository.saveRate(freshRate);

      // Act
      const deletedCount = await repository.deleteExpired();

      // Assert
      expect(deletedCount).toBe(0);
    });

    it('should handle empty table', async () => {
      // Act
      const deletedCount = await repository.deleteExpired();

      // Assert
      expect(deletedCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw DatabaseError on database failure', async () => {
      // Arrange - Create exchange rate with invalid data
      const exchangeRate = new ExchangeRate(
        'INVALID' as Currency, // Invalid currency
        'USD',
        1.0,
        new Date()
      );

      // Act & Assert
      await expect(repository.saveRate(exchangeRate)).rejects.toThrow();
    });
  });
});
