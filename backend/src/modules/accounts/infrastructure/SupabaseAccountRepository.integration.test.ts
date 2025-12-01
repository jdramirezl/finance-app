/**
 * Integration Tests for SupabaseAccountRepository
 * 
 * These tests interact with a real Supabase database to verify repository operations.
 * They test the actual database interactions, not mocked behavior.
 * 
 * Prerequisites:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment
 * - Database must have the accounts table with proper schema
 * - Tests use a test user ID to isolate test data
 */

import { SupabaseAccountRepository } from './SupabaseAccountRepository';
import { Account } from '../domain/Account';
import { DatabaseError } from '../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';
import { createClient } from '@supabase/supabase-js';

// Skip integration tests if environment variables are not set
const describeIntegration = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? describe
  : describe.skip;

describeIntegration('SupabaseAccountRepository Integration Tests', () => {
  let repository: SupabaseAccountRepository;
  let testUserId: string;
  let supabase: any;

  // Setup: Create repository and test user ID
  beforeAll(() => {
    repository = new SupabaseAccountRepository();
    testUserId = `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Create Supabase client for cleanup
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  });

  // Cleanup: Delete all test data after each test
  afterEach(async () => {
    // Delete all accounts created by test user
    await supabase
      .from('accounts')
      .delete()
      .eq('user_id', testUserId);
  });

  describe('save operation', () => {
    it('should save a normal account to the database', async () => {
      // Arrange
      const account = new Account(
        'acc-1',
        'Test Checking',
        '#3b82f6',
        'USD',
        0,
        'normal'
      );

      // Act
      await repository.save(account, testUserId);

      // Assert - Verify account was saved by fetching it
      const saved = await repository.findById('acc-1', testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe('acc-1');
      expect(saved?.name).toBe('Test Checking');
      expect(saved?.color).toBe('#3b82f6');
      expect(saved?.currency).toBe('USD');
      expect(saved?.balance).toBe(0);
      expect(saved?.type).toBe('normal');
    });

    it('should save an investment account with all fields', async () => {
      // Arrange
      const account = new Account(
        'acc-2',
        'VOO Investment',
        '#10b981',
        'USD',
        25000,
        'investment',
        'VOO',
        20000,
        50,
        1
      );

      // Act
      await repository.save(account, testUserId);

      // Assert
      const saved = await repository.findById('acc-2', testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.stockSymbol).toBe('VOO');
      expect(saved?.montoInvertido).toBe(20000);
      expect(saved?.shares).toBe(50);
      expect(saved?.displayOrder).toBe(1);
    });

    it('should throw DatabaseError when saving duplicate ID', async () => {
      // Arrange
      const account1 = new Account('acc-dup', 'First', '#3b82f6', 'USD', 0);
      const account2 = new Account('acc-dup', 'Second', '#ef4444', 'MXN', 0);

      // Act & Assert
      await repository.save(account1, testUserId);
      await expect(repository.save(account2, testUserId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('findById operation', () => {
    it('should find an existing account by ID', async () => {
      // Arrange
      const account = new Account('acc-find-1', 'Savings', '#8b5cf6', 'EUR', 5000);
      await repository.save(account, testUserId);

      // Act
      const found = await repository.findById('acc-find-1', testUserId);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe('acc-find-1');
      expect(found?.name).toBe('Savings');
      expect(found?.currency).toBe('EUR');
    });

    it('should return null when account does not exist', async () => {
      // Act
      const found = await repository.findById('non-existent', testUserId);

      // Assert
      expect(found).toBeNull();
    });

    it('should return null when account belongs to different user', async () => {
      // Arrange
      const account = new Account('acc-other-user', 'Private', '#3b82f6', 'USD', 0);
      await repository.save(account, 'other-user-id');

      // Act
      const found = await repository.findById('acc-other-user', testUserId);

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findAllByUserId with sorting', () => {
    it('should return empty array when user has no accounts', async () => {
      // Act
      const accounts = await repository.findAllByUserId(testUserId);

      // Assert
      expect(accounts).toEqual([]);
    });

    it('should return all accounts for a user', async () => {
      // Arrange
      const account1 = new Account('acc-all-1', 'Checking', '#3b82f6', 'USD', 1000);
      const account2 = new Account('acc-all-2', 'Savings', '#10b981', 'USD', 5000);
      const account3 = new Account('acc-all-3', 'Investment', '#8b5cf6', 'USD', 25000, 'investment', 'VOO');

      await repository.save(account1, testUserId);
      await repository.save(account2, testUserId);
      await repository.save(account3, testUserId);

      // Act
      const accounts = await repository.findAllByUserId(testUserId);

      // Assert
      expect(accounts).toHaveLength(3);
      expect(accounts.map(a => a.id)).toContain('acc-all-1');
      expect(accounts.map(a => a.id)).toContain('acc-all-2');
      expect(accounts.map(a => a.id)).toContain('acc-all-3');
    });

    it('should sort accounts by display order ascending', async () => {
      // Arrange
      const account1 = new Account('acc-sort-1', 'Third', '#3b82f6', 'USD', 0, 'normal', undefined, undefined, undefined, 2);
      const account2 = new Account('acc-sort-2', 'First', '#10b981', 'USD', 0, 'normal', undefined, undefined, undefined, 0);
      const account3 = new Account('acc-sort-3', 'Second', '#8b5cf6', 'USD', 0, 'normal', undefined, undefined, undefined, 1);

      await repository.save(account1, testUserId);
      await repository.save(account2, testUserId);
      await repository.save(account3, testUserId);

      // Act
      const accounts = await repository.findAllByUserId(testUserId);

      // Assert
      expect(accounts).toHaveLength(3);
      expect(accounts[0].name).toBe('First');
      expect(accounts[0].displayOrder).toBe(0);
      expect(accounts[1].name).toBe('Second');
      expect(accounts[1].displayOrder).toBe(1);
      expect(accounts[2].name).toBe('Third');
      expect(accounts[2].displayOrder).toBe(2);
    });

    it('should place null display orders last', async () => {
      // Arrange
      const account1 = new Account('acc-null-1', 'Has Order', '#3b82f6', 'USD', 0, 'normal', undefined, undefined, undefined, 0);
      const account2 = new Account('acc-null-2', 'No Order', '#10b981', 'USD', 0);

      await repository.save(account1, testUserId);
      await repository.save(account2, testUserId);

      // Act
      const accounts = await repository.findAllByUserId(testUserId);

      // Assert
      expect(accounts).toHaveLength(2);
      expect(accounts[0].name).toBe('Has Order');
      expect(accounts[1].name).toBe('No Order');
    });

    it('should not return accounts from other users', async () => {
      // Arrange
      const myAccount = new Account('acc-mine', 'My Account', '#3b82f6', 'USD', 0);
      const otherAccount = new Account('acc-other', 'Other Account', '#10b981', 'USD', 0);

      await repository.save(myAccount, testUserId);
      await repository.save(otherAccount, 'other-user-id');

      // Act
      const accounts = await repository.findAllByUserId(testUserId);

      // Assert
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe('acc-mine');
    });
  });

  describe('existsByNameAndCurrency', () => {
    it('should return true when account with name and currency exists', async () => {
      // Arrange
      const account = new Account('acc-exists-1', 'Checking', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      const exists = await repository.existsByNameAndCurrency('Checking', 'USD', testUserId);

      // Assert
      expect(exists).toBe(true);
    });

    it('should return false when account does not exist', async () => {
      // Act
      const exists = await repository.existsByNameAndCurrency('Non-existent', 'USD', testUserId);

      // Assert
      expect(exists).toBe(false);
    });

    it('should return false when name matches but currency differs', async () => {
      // Arrange
      const account = new Account('acc-exists-2', 'Savings', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      const exists = await repository.existsByNameAndCurrency('Savings', 'EUR', testUserId);

      // Assert
      expect(exists).toBe(false);
    });

    it('should return false when currency matches but name differs', async () => {
      // Arrange
      const account = new Account('acc-exists-3', 'Checking', '#3b82f6', 'MXN', 0);
      await repository.save(account, testUserId);

      // Act
      const exists = await repository.existsByNameAndCurrency('Savings', 'MXN', testUserId);

      // Assert
      expect(exists).toBe(false);
    });

    it('should be case-sensitive for account names', async () => {
      // Arrange
      const account = new Account('acc-exists-4', 'Checking', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      const exists = await repository.existsByNameAndCurrency('checking', 'USD', testUserId);

      // Assert
      expect(exists).toBe(false);
    });

    it('should not find accounts from other users', async () => {
      // Arrange
      const account = new Account('acc-exists-5', 'Private', '#3b82f6', 'USD', 0);
      await repository.save(account, 'other-user-id');

      // Act
      const exists = await repository.existsByNameAndCurrency('Private', 'USD', testUserId);

      // Assert
      expect(exists).toBe(false);
    });
  });

  describe('update operation', () => {
    it('should update account name', async () => {
      // Arrange
      const account = new Account('acc-update-1', 'Old Name', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      account.update('New Name', undefined, undefined);
      await repository.update(account, testUserId);

      // Assert
      const updated = await repository.findById('acc-update-1', testUserId);
      expect(updated?.name).toBe('New Name');
    });

    it('should update account color', async () => {
      // Arrange
      const account = new Account('acc-update-2', 'Test', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      account.update(undefined, '#ef4444', undefined);
      await repository.update(account, testUserId);

      // Assert
      const updated = await repository.findById('acc-update-2', testUserId);
      expect(updated?.color).toBe('#ef4444');
    });

    it('should update account currency', async () => {
      // Arrange
      const account = new Account('acc-update-3', 'Test', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      account.update(undefined, undefined, 'EUR');
      await repository.update(account, testUserId);

      // Assert
      const updated = await repository.findById('acc-update-3', testUserId);
      expect(updated?.currency).toBe('EUR');
    });

    it('should update account balance', async () => {
      // Arrange
      const account = new Account('acc-update-4', 'Test', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      account.updateBalance(5000);
      await repository.update(account, testUserId);

      // Assert
      const updated = await repository.findById('acc-update-4', testUserId);
      expect(updated?.balance).toBe(5000);
    });

    it('should update investment account fields', async () => {
      // Arrange
      const account = new Account('acc-update-5', 'Investment', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      await repository.save(account, testUserId);

      // Act
      account.updateInvestmentDetails(75, 15000);
      await repository.update(account, testUserId);

      // Assert
      const updated = await repository.findById('acc-update-5', testUserId);
      expect(updated?.shares).toBe(75);
      expect(updated?.montoInvertido).toBe(15000);
    });

    it('should update display order', async () => {
      // Arrange
      const account = new Account('acc-update-6', 'Test', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      account.updateDisplayOrder(5);
      await repository.update(account, testUserId);

      // Assert
      const updated = await repository.findById('acc-update-6', testUserId);
      expect(updated?.displayOrder).toBe(5);
    });

    it('should not update accounts from other users', async () => {
      // Arrange
      const account = new Account('acc-update-7', 'Original', '#3b82f6', 'USD', 0);
      await repository.save(account, 'other-user-id');

      // Act
      account.update('Modified', undefined, undefined);
      await repository.update(account, testUserId);

      // Assert - Verify it wasn't updated
      const { data } = await supabase
        .from('accounts')
        .select('name')
        .eq('id', 'acc-update-7')
        .single();
      
      expect(data.name).toBe('Original');
    });
  });

  describe('delete operation', () => {
    it('should delete an existing account', async () => {
      // Arrange
      const account = new Account('acc-delete-1', 'To Delete', '#3b82f6', 'USD', 0);
      await repository.save(account, testUserId);

      // Act
      await repository.delete('acc-delete-1', testUserId);

      // Assert
      const deleted = await repository.findById('acc-delete-1', testUserId);
      expect(deleted).toBeNull();
    });

    it('should not throw error when deleting non-existent account', async () => {
      // Act & Assert
      await expect(repository.delete('non-existent', testUserId)).resolves.not.toThrow();
    });

    it('should not delete accounts from other users', async () => {
      // Arrange
      const account = new Account('acc-delete-2', 'Protected', '#3b82f6', 'USD', 0);
      await repository.save(account, 'other-user-id');

      // Act
      await repository.delete('acc-delete-2', testUserId);

      // Assert - Verify it still exists
      const { data } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', 'acc-delete-2')
        .single();
      
      expect(data).not.toBeNull();
      expect(data.id).toBe('acc-delete-2');
    });

    it('should allow re-creating account with same ID after deletion', async () => {
      // Arrange
      const account1 = new Account('acc-delete-3', 'First', '#3b82f6', 'USD', 0);
      await repository.save(account1, testUserId);
      await repository.delete('acc-delete-3', testUserId);

      // Act
      const account2 = new Account('acc-delete-3', 'Second', '#ef4444', 'EUR', 1000);
      await repository.save(account2, testUserId);

      // Assert
      const recreated = await repository.findById('acc-delete-3', testUserId);
      expect(recreated).not.toBeNull();
      expect(recreated?.name).toBe('Second');
      expect(recreated?.currency).toBe('EUR');
    });
  });
});
