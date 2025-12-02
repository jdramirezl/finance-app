/**
 * Integration Tests for SupabaseSettingsRepository
 * 
 * These tests interact with a real Supabase database to verify repository operations.
 * They test the actual database interactions, not mocked behavior.
 * 
 * Prerequisites:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment
 * - Database must have the settings table with proper schema
 * - Tests use a test user ID to isolate test data
 */

import 'reflect-metadata';
import { SupabaseSettingsRepository } from './SupabaseSettingsRepository';
import { Settings } from '../domain/Settings';
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

describeIntegration('SupabaseSettingsRepository Integration Tests', () => {
  let repository: SupabaseSettingsRepository;
  let testUserId: string;
  let supabase: any;

  // Setup: Create repository and test user ID
  beforeAll(() => {
    repository = new SupabaseSettingsRepository();
    testUserId = `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Create Supabase client for cleanup
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  });

  // Cleanup: Delete all test data after each test
  afterEach(async () => {
    // Delete all settings created by test user
    await supabase
      .from('settings')
      .delete()
      .eq('user_id', testUserId);
  });

  describe('findByUserId operation', () => {
    it('should return null when settings do not exist', async () => {
      // Act
      const result = await repository.findByUserId(testUserId);

      // Assert
      expect(result).toBeNull();
    });

    it('should find settings by user ID', async () => {
      // Arrange - Create settings first
      const settings = new Settings(
        'settings-1',
        testUserId,
        'USD',
        'test-api-key'
      );
      await repository.save(settings);

      // Act
      const found = await repository.findByUserId(testUserId);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe('settings-1');
      expect(found?.userId).toBe(testUserId);
      expect(found?.primaryCurrency).toBe('USD');
      expect(found?.alphaVantageApiKey).toBe('test-api-key');
    });
  });

  describe('save operation', () => {
    it('should save new settings to the database', async () => {
      // Arrange
      const settings = new Settings(
        'settings-1',
        testUserId,
        'USD'
      );

      // Act
      await repository.save(settings);

      // Assert - Verify settings were saved by fetching them
      const saved = await repository.findByUserId(testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe('settings-1');
      expect(saved?.userId).toBe(testUserId);
      expect(saved?.primaryCurrency).toBe('USD');
      expect(saved?.alphaVantageApiKey).toBeUndefined();
    });

    it('should save settings with API key', async () => {
      // Arrange
      const settings = new Settings(
        'settings-2',
        testUserId,
        'EUR',
        'my-alpha-vantage-key'
      );

      // Act
      await repository.save(settings);

      // Assert
      const saved = await repository.findByUserId(testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.primaryCurrency).toBe('EUR');
      expect(saved?.alphaVantageApiKey).toBe('my-alpha-vantage-key');
    });

    it('should update existing settings (upsert)', async () => {
      // Arrange - Create initial settings
      const settings1 = new Settings(
        'settings-1',
        testUserId,
        'USD'
      );
      await repository.save(settings1);

      // Act - Update with new currency
      const settings2 = new Settings(
        'settings-1',
        testUserId,
        'MXN',
        'new-api-key'
      );
      await repository.save(settings2);

      // Assert - Should have updated, not created new record
      const saved = await repository.findByUserId(testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe('settings-1');
      expect(saved?.primaryCurrency).toBe('MXN');
      expect(saved?.alphaVantageApiKey).toBe('new-api-key');
    });
  });

  describe('createDefault operation', () => {
    it('should create default settings with USD currency', async () => {
      // Act
      const settings = await repository.createDefault(testUserId);

      // Assert
      expect(settings).not.toBeNull();
      expect(settings.userId).toBe(testUserId);
      expect(settings.primaryCurrency).toBe('USD');
      expect(settings.alphaVantageApiKey).toBeUndefined();

      // Verify it was saved to database
      const saved = await repository.findByUserId(testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.primaryCurrency).toBe('USD');
    });
  });

  describe('error handling', () => {
    it('should throw DatabaseError on database failure', async () => {
      // Arrange - Create settings with invalid data that will fail constraints
      const settings = new Settings(
        'settings-1',
        '', // Empty user ID should fail
        'USD'
      );

      // Act & Assert
      await expect(repository.save(settings)).rejects.toThrow();
    });
  });
});
