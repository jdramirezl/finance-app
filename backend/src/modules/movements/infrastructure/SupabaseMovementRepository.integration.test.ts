/**
 * Integration Tests for SupabaseMovementRepository
 * 
 * These tests interact with a real Supabase database to verify repository operations.
 * They test the actual database interactions, not mocked behavior.
 * 
 * Prerequisites:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment
 * - Database must have the movements, accounts, and pockets tables with proper schema
 * - Tests use a test user ID to isolate test data
 */

import 'reflect-metadata';
import { SupabaseMovementRepository } from './SupabaseMovementRepository';
import { Movement } from '../domain/Movement';
import { DatabaseError } from '../../../shared/errors/AppError';
import type { Currency, MovementType } from '@shared-backend/types';
import { createClient } from '@supabase/supabase-js';

// Skip integration tests by default (they require real database)
// To run these tests, set RUN_INTEGRATION_TESTS=true in addition to Supabase credentials
const describeIntegration = 
  process.env.RUN_INTEGRATION_TESTS === 'true' && 
  process.env.SUPABASE_URL && 
  process.env.SUPABASE_SERVICE_KEY
    ? describe
    : describe.skip;

describeIntegration('SupabaseMovementRepository Integration Tests', () => {
  let repository: SupabaseMovementRepository;
  let testUserId: string;
  let supabase: any;
  let testAccountId: string;
  let testPocketId: string;
  let testSubPocketId: string;

  // Setup: Create repository, test user ID, and test account/pocket
  beforeAll(async () => {
    repository = new SupabaseMovementRepository();
    testUserId = `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Create Supabase client for setup and cleanup
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Create test account
    testAccountId = `test-acc-${Date.now()}`;
    await supabase.from('accounts').insert({
      id: testAccountId,
      user_id: testUserId,
      name: 'Test Account',
      color: '#3b82f6',
      currency: 'USD',
      balance: 0,
      type: 'normal',
    });

    // Create test pocket
    testPocketId = `test-pocket-${Date.now()}`;
    await supabase.from('pockets').insert({
      id: testPocketId,
      user_id: testUserId,
      account_id: testAccountId,
      name: 'Test Pocket',
      type: 'normal',
      balance: 0,
      currency: 'USD',
    });

    // Create test sub-pocket (for fixed pocket tests)
    testSubPocketId = `test-subpocket-${Date.now()}`;
  });

  // Cleanup: Delete all test data after each test
  afterEach(async () => {
    // Delete all movements created by test user
    await supabase
      .from('movements')
      .delete()
      .eq('user_id', testUserId);
  });

  // Final cleanup: Delete test account and pocket
  afterAll(async () => {
    await supabase.from('movements').delete().eq('user_id', testUserId);
    await supabase.from('pockets').delete().eq('user_id', testUserId);
    await supabase.from('accounts').delete().eq('user_id', testUserId);
  });

  describe('save operation', () => {
    it('should save a normal income movement to the database', async () => {
      // Arrange
      const movement = new Movement(
        'mov-1',
        'IngresoNormal',
        testAccountId,
        testPocketId,
        1000,
        new Date('2024-01-15'),
        'Salary'
      );

      // Act
      await repository.save(movement, testUserId);

      // Assert - Verify movement was saved by fetching it
      const saved = await repository.findById('mov-1', testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe('mov-1');
      expect(saved?.type).toBe('IngresoNormal');
      expect(saved?.amount).toBe(1000);
      expect(saved?.notes).toBe('Salary');
      expect(saved?.isPending).toBe(false);
      expect(saved?.isOrphaned).toBe(false);
    });

    it('should save a pending expense movement', async () => {
      // Arrange
      const movement = new Movement(
        'mov-2',
        'EgresoNormal',
        testAccountId,
        testPocketId,
        500,
        new Date('2024-01-20'),
        'Groceries',
        undefined,
        true
      );

      // Act
      await repository.save(movement, testUserId);

      // Assert
      const saved = await repository.findById('mov-2', testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.isPending).toBe(true);
    });

    it('should save an orphaned movement with orphan data', async () => {
      // Arrange
      const movement = new Movement(
        'mov-3',
        'EgresoNormal',
        testAccountId,
        testPocketId,
        300,
        new Date('2024-01-25'),
        'Old expense',
        undefined,
        false,
        true,
        'Old Account',
        'USD',
        'Old Pocket'
      );

      // Act
      await repository.save(movement, testUserId);

      // Assert
      const saved = await repository.findById('mov-3', testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.isOrphaned).toBe(true);
      expect(saved?.orphanedAccountName).toBe('Old Account');
      expect(saved?.orphanedAccountCurrency).toBe('USD');
      expect(saved?.orphanedPocketName).toBe('Old Pocket');
    });
  });

  describe('findById operation', () => {
    it('should find an existing movement by ID', async () => {
      // Arrange
      const movement = new Movement(
        'mov-find-1',
        'IngresoNormal',
        testAccountId,
        testPocketId,
        2000,
        new Date('2024-02-01')
      );
      await repository.save(movement, testUserId);

      // Act
      const found = await repository.findById('mov-find-1', testUserId);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe('mov-find-1');
      expect(found?.amount).toBe(2000);
    });

    it('should return null when movement does not exist', async () => {
      // Act
      const found = await repository.findById('non-existent', testUserId);

      // Assert
      expect(found).toBeNull();
    });

    it('should return null when movement belongs to different user', async () => {
      // Arrange
      const movement = new Movement(
        'mov-other-user',
        'IngresoNormal',
        testAccountId,
        testPocketId,
        1000,
        new Date('2024-02-01')
      );
      
      // Save with different user ID
      await supabase.from('movements').insert({
        id: 'mov-other-user',
        user_id: 'other-user-id',
        type: 'IngresoNormal',
        account_id: testAccountId,
        pocket_id: testPocketId,
        amount: 1000,
        displayed_date: new Date('2024-02-01').toISOString(),
        is_pending: false,
        is_orphaned: false,
      });

      // Act
      const found = await repository.findById('mov-other-user', testUserId);

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findAll with filters', () => {
    beforeEach(async () => {
      // Create test movements
      const movements = [
        new Movement('mov-all-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date('2024-01-15')),
        new Movement('mov-all-2', 'EgresoNormal', testAccountId, testPocketId, 500, new Date('2024-01-20')),
        new Movement('mov-all-3', 'IngresoNormal', testAccountId, testPocketId, 2000, new Date('2024-02-10'), undefined, undefined, true),
        new Movement('mov-all-4', 'EgresoNormal', testAccountId, testPocketId, 300, new Date('2024-02-15'), undefined, undefined, false, true, 'Old', 'USD', 'Old'),
      ];

      for (const movement of movements) {
        await repository.save(movement, testUserId);
      }
    });

    it('should return all movements when no filters applied', async () => {
      // Act
      const movements = await repository.findAll(testUserId);

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter by account ID', async () => {
      // Act
      const movements = await repository.findAll(testUserId, { accountId: testAccountId });

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(4);
      movements.forEach(m => expect(m.accountId).toBe(testAccountId));
    });

    it('should filter by pocket ID', async () => {
      // Act
      const movements = await repository.findAll(testUserId, { pocketId: testPocketId });

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(4);
      movements.forEach(m => expect(m.pocketId).toBe(testPocketId));
    });

    it('should filter by pending status', async () => {
      // Act
      const movements = await repository.findAll(testUserId, { isPending: true });

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(1);
      movements.forEach(m => expect(m.isPending).toBe(true));
    });

    it('should filter by orphaned status', async () => {
      // Act
      const movements = await repository.findAll(testUserId, { isOrphaned: true });

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(1);
      movements.forEach(m => expect(m.isOrphaned).toBe(true));
    });

    it('should filter by month', async () => {
      // Act
      const movements = await repository.findAll(testUserId, { year: 2024, month: 1 });

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(2);
      movements.forEach(m => {
        const year = m.displayedDate.getFullYear();
        const month = m.displayedDate.getMonth() + 1;
        expect(year).toBe(2024);
        expect(month).toBe(1);
      });
    });

    it('should apply pagination', async () => {
      // Act
      const page1 = await repository.findAll(testUserId, {}, { limit: 2, offset: 0 });
      const page2 = await repository.findAll(testUserId, {}, { limit: 2, offset: 2 });

      // Assert
      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
      // Ensure different movements
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });

    it('should sort by displayed date descending', async () => {
      // Act
      const movements = await repository.findAll(testUserId);

      // Assert
      for (let i = 0; i < movements.length - 1; i++) {
        expect(movements[i].displayedDate.getTime()).toBeGreaterThanOrEqual(
          movements[i + 1].displayedDate.getTime()
        );
      }
    });
  });

  describe('findByAccountId', () => {
    it('should return movements for specific account', async () => {
      // Arrange
      const movement = new Movement('mov-acc-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      await repository.save(movement, testUserId);

      // Act
      const movements = await repository.findByAccountId(testAccountId, testUserId);

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(1);
      movements.forEach(m => expect(m.accountId).toBe(testAccountId));
    });
  });

  describe('findByPocketId', () => {
    it('should return movements for specific pocket', async () => {
      // Arrange
      const movement = new Movement('mov-pocket-1', 'EgresoNormal', testAccountId, testPocketId, 500, new Date());
      await repository.save(movement, testUserId);

      // Act
      const movements = await repository.findByPocketId(testPocketId, testUserId);

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(1);
      movements.forEach(m => expect(m.pocketId).toBe(testPocketId));
    });
  });

  describe('findByMonth', () => {
    it('should return movements for specific month', async () => {
      // Arrange
      const movement = new Movement('mov-month-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date('2024-03-15'));
      await repository.save(movement, testUserId);

      // Act
      const movements = await repository.findByMonth(2024, 3, testUserId);

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(1);
      movements.forEach(m => {
        const year = m.displayedDate.getFullYear();
        const month = m.displayedDate.getMonth() + 1;
        expect(year).toBe(2024);
        expect(month).toBe(3);
      });
    });
  });

  describe('findPending', () => {
    it('should return only pending movements', async () => {
      // Arrange
      const pending = new Movement('mov-pend-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date(), undefined, undefined, true);
      const normal = new Movement('mov-pend-2', 'EgresoNormal', testAccountId, testPocketId, 500, new Date());
      await repository.save(pending, testUserId);
      await repository.save(normal, testUserId);

      // Act
      const movements = await repository.findPending(testUserId);

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(1);
      movements.forEach(m => expect(m.isPending).toBe(true));
    });
  });

  describe('findOrphaned', () => {
    it('should return only orphaned movements', async () => {
      // Arrange
      const orphaned = new Movement('mov-orph-1', 'EgresoNormal', testAccountId, testPocketId, 300, new Date(), undefined, undefined, false, true, 'Old', 'USD', 'Old');
      const normal = new Movement('mov-orph-2', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      await repository.save(orphaned, testUserId);
      await repository.save(normal, testUserId);

      // Act
      const movements = await repository.findOrphaned(testUserId);

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(1);
      movements.forEach(m => expect(m.isOrphaned).toBe(true));
    });
  });

  describe('findOrphanedByAccount', () => {
    it('should return orphaned movements matching account name and currency', async () => {
      // Arrange
      const orphaned1 = new Movement('mov-orph-acc-1', 'EgresoNormal', testAccountId, testPocketId, 300, new Date(), undefined, undefined, false, true, 'Savings', 'USD', 'General');
      const orphaned2 = new Movement('mov-orph-acc-2', 'EgresoNormal', testAccountId, testPocketId, 400, new Date(), undefined, undefined, false, true, 'Savings', 'EUR', 'General');
      await repository.save(orphaned1, testUserId);
      await repository.save(orphaned2, testUserId);

      // Act
      const movements = await repository.findOrphanedByAccount('Savings', 'USD', testUserId);

      // Assert
      expect(movements.length).toBeGreaterThanOrEqual(1);
      movements.forEach(m => {
        expect(m.isOrphaned).toBe(true);
        expect(m.orphanedAccountName).toBe('Savings');
        expect(m.orphanedAccountCurrency).toBe('USD');
      });
    });
  });

  describe('update operation', () => {
    it('should update movement amount', async () => {
      // Arrange
      const movement = new Movement('mov-upd-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      await repository.save(movement, testUserId);

      // Act
      movement.update(undefined, 1500);
      await repository.update(movement, testUserId);

      // Assert
      const updated = await repository.findById('mov-upd-1', testUserId);
      expect(updated?.amount).toBe(1500);
    });

    it('should update movement type', async () => {
      // Arrange
      const movement = new Movement('mov-upd-2', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      await repository.save(movement, testUserId);

      // Act
      movement.update('EgresoNormal');
      await repository.update(movement, testUserId);

      // Assert
      const updated = await repository.findById('mov-upd-2', testUserId);
      expect(updated?.type).toBe('EgresoNormal');
    });

    it('should update pending status', async () => {
      // Arrange
      const movement = new Movement('mov-upd-3', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      await repository.save(movement, testUserId);

      // Act
      movement.markAsPending();
      await repository.update(movement, testUserId);

      // Assert
      const updated = await repository.findById('mov-upd-3', testUserId);
      expect(updated?.isPending).toBe(true);
    });
  });

  describe('delete operation', () => {
    it('should delete an existing movement', async () => {
      // Arrange
      const movement = new Movement('mov-del-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      await repository.save(movement, testUserId);

      // Act
      await repository.delete('mov-del-1', testUserId);

      // Assert
      const deleted = await repository.findById('mov-del-1', testUserId);
      expect(deleted).toBeNull();
    });
  });

  describe('deleteByAccountId', () => {
    it('should delete all movements for an account', async () => {
      // Arrange
      const movement1 = new Movement('mov-del-acc-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      const movement2 = new Movement('mov-del-acc-2', 'EgresoNormal', testAccountId, testPocketId, 500, new Date());
      await repository.save(movement1, testUserId);
      await repository.save(movement2, testUserId);

      // Act
      const count = await repository.deleteByAccountId(testAccountId, testUserId);

      // Assert
      expect(count).toBeGreaterThanOrEqual(2);
      const remaining = await repository.findByAccountId(testAccountId, testUserId);
      expect(remaining.length).toBe(0);
    });
  });

  describe('markAsOrphanedByPocketId', () => {
    it('should mark all movements for a pocket as orphaned', async () => {
      // Arrange
      const movement1 = new Movement('mov-orph-pocket-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      const movement2 = new Movement('mov-orph-pocket-2', 'EgresoNormal', testAccountId, testPocketId, 500, new Date());
      await repository.save(movement1, testUserId);
      await repository.save(movement2, testUserId);

      // Act
      const count = await repository.markAsOrphanedByPocketId(testPocketId, 'Test Pocket', testUserId);

      // Assert
      expect(count).toBeGreaterThanOrEqual(2);
      const orphaned = await repository.findByPocketId(testPocketId, testUserId);
      orphaned.forEach(m => {
        expect(m.isOrphaned).toBe(true);
        expect(m.orphanedPocketName).toBe('Test Pocket');
      });
    });
  });

  describe('updateAccountIdByPocketId', () => {
    it('should update account ID for all movements in a pocket', async () => {
      // Arrange
      const newAccountId = `new-acc-${Date.now()}`;
      await supabase.from('accounts').insert({
        id: newAccountId,
        user_id: testUserId,
        name: 'New Account',
        color: '#10b981',
        currency: 'USD',
        balance: 0,
        type: 'normal',
      });

      const movement = new Movement('mov-migrate-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date());
      await repository.save(movement, testUserId);

      // Act
      const count = await repository.updateAccountIdByPocketId(testPocketId, newAccountId, testUserId);

      // Assert
      expect(count).toBeGreaterThanOrEqual(1);
      const updated = await repository.findById('mov-migrate-1', testUserId);
      expect(updated?.accountId).toBe(newAccountId);
    });
  });

  describe('count operation', () => {
    beforeEach(async () => {
      // Create test movements
      const movements = [
        new Movement('mov-count-1', 'IngresoNormal', testAccountId, testPocketId, 1000, new Date('2024-01-15')),
        new Movement('mov-count-2', 'EgresoNormal', testAccountId, testPocketId, 500, new Date('2024-01-20')),
        new Movement('mov-count-3', 'IngresoNormal', testAccountId, testPocketId, 2000, new Date('2024-02-10'), undefined, undefined, true),
      ];

      for (const movement of movements) {
        await repository.save(movement, testUserId);
      }
    });

    it('should count all movements', async () => {
      // Act
      const count = await repository.count(testUserId);

      // Assert
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should count movements with filters', async () => {
      // Act
      const count = await repository.count(testUserId, { isPending: true });

      // Assert
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
