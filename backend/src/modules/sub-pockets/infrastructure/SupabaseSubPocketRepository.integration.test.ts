/**
 * Integration Tests for SupabaseSubPocketRepository
 * 
 * These tests interact with a real Supabase database to verify repository operations.
 * They test the actual database interactions, not mocked behavior.
 * 
 * Prerequisites:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment
 * - Database must have the sub_pockets table with proper schema
 * - Tests use a test user ID to isolate test data
 */

import 'reflect-metadata';
import { SupabaseSubPocketRepository } from './SupabaseSubPocketRepository';
import { SubPocket } from '../domain/SubPocket';
import { DatabaseError } from '../../../shared/errors/AppError';
import { createClient } from '@supabase/supabase-js';

// Skip integration tests by default (they require real database)
const describeIntegration = 
  process.env.RUN_INTEGRATION_TESTS === 'true' && 
  process.env.SUPABASE_URL && 
  process.env.SUPABASE_SERVICE_KEY
    ? describe
    : describe.skip;

describeIntegration('SupabaseSubPocketRepository Integration Tests', () => {
  let repository: SupabaseSubPocketRepository;
  let testUserId: string;
  let supabase: any;

  beforeAll(() => {
    repository = new SupabaseSubPocketRepository();
    testUserId = `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  });

  afterEach(async () => {
    // Delete all sub-pockets created by test user
    await supabase
      .from('sub_pockets')
      .delete()
      .eq('user_id', testUserId);
  });

  describe('save operation', () => {
    it('should save a sub-pocket to the database', async () => {
      const subPocket = new SubPocket(
        'sp-1',
        'pocket-1',
        'Rent',
        1200,
        1,
        0,
        true
      );

      await repository.save(subPocket, testUserId);

      const saved = await repository.findById('sp-1', testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe('sp-1');
      expect(saved?.name).toBe('Rent');
      expect(saved?.valueTotal).toBe(1200);
      expect(saved?.periodicityMonths).toBe(1);
      expect(saved?.enabled).toBe(true);
    });

    it('should save a sub-pocket with group and display order', async () => {
      const subPocket = new SubPocket(
        'sp-2',
        'pocket-1',
        'Internet',
        600,
        1,
        0,
        true,
        'group-1',
        5
      );

      await repository.save(subPocket, testUserId);

      const saved = await repository.findById('sp-2', testUserId);
      expect(saved?.groupId).toBe('group-1');
      expect(saved?.displayOrder).toBe(5);
    });

    it('should throw DatabaseError when saving duplicate ID', async () => {
      const subPocket1 = new SubPocket('sp-dup', 'pocket-1', 'First', 100, 1, 0);
      const subPocket2 = new SubPocket('sp-dup', 'pocket-1', 'Second', 200, 1, 0);

      await repository.save(subPocket1, testUserId);
      await expect(repository.save(subPocket2, testUserId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('findById operation', () => {
    it('should find an existing sub-pocket by ID', async () => {
      const subPocket = new SubPocket('sp-find-1', 'pocket-1', 'Utilities', 150, 1, 50);
      await repository.save(subPocket, testUserId);

      const found = await repository.findById('sp-find-1', testUserId);

      expect(found).not.toBeNull();
      expect(found?.id).toBe('sp-find-1');
      expect(found?.name).toBe('Utilities');
      expect(found?.balance).toBe(50);
    });

    it('should return null when sub-pocket does not exist', async () => {
      const found = await repository.findById('non-existent', testUserId);
      expect(found).toBeNull();
    });

    it('should return null when sub-pocket belongs to different user', async () => {
      const subPocket = new SubPocket('sp-other', 'pocket-1', 'Private', 100, 1, 0);
      await repository.save(subPocket, 'other-user-id');

      const found = await repository.findById('sp-other', testUserId);
      expect(found).toBeNull();
    });
  });

  describe('findByPocketId with sorting', () => {
    it('should return empty array when pocket has no sub-pockets', async () => {
      const subPockets = await repository.findByPocketId('empty-pocket', testUserId);
      expect(subPockets).toEqual([]);
    });

    it('should return all sub-pockets for a pocket', async () => {
      const sp1 = new SubPocket('sp-p1-1', 'pocket-1', 'Rent', 1200, 1, 0);
      const sp2 = new SubPocket('sp-p1-2', 'pocket-1', 'Utilities', 150, 1, 0);
      const sp3 = new SubPocket('sp-p2-1', 'pocket-2', 'Other', 100, 1, 0);

      await repository.save(sp1, testUserId);
      await repository.save(sp2, testUserId);
      await repository.save(sp3, testUserId);

      const subPockets = await repository.findByPocketId('pocket-1', testUserId);

      expect(subPockets).toHaveLength(2);
      expect(subPockets.map(sp => sp.id)).toContain('sp-p1-1');
      expect(subPockets.map(sp => sp.id)).toContain('sp-p1-2');
    });

    it('should sort sub-pockets by display order ascending', async () => {
      const sp1 = new SubPocket('sp-sort-1', 'pocket-1', 'Third', 100, 1, 0, true, undefined, 2);
      const sp2 = new SubPocket('sp-sort-2', 'pocket-1', 'First', 100, 1, 0, true, undefined, 0);
      const sp3 = new SubPocket('sp-sort-3', 'pocket-1', 'Second', 100, 1, 0, true, undefined, 1);

      await repository.save(sp1, testUserId);
      await repository.save(sp2, testUserId);
      await repository.save(sp3, testUserId);

      const subPockets = await repository.findByPocketId('pocket-1', testUserId);

      expect(subPockets).toHaveLength(3);
      expect(subPockets[0].name).toBe('First');
      expect(subPockets[1].name).toBe('Second');
      expect(subPockets[2].name).toBe('Third');
    });
  });

  describe('findByGroupId with sorting', () => {
    it('should return empty array when group has no sub-pockets', async () => {
      const subPockets = await repository.findByGroupId('empty-group', testUserId);
      expect(subPockets).toEqual([]);
    });

    it('should return all sub-pockets for a group', async () => {
      const sp1 = new SubPocket('sp-g1-1', 'pocket-1', 'Rent', 1200, 1, 0, true, 'group-1');
      const sp2 = new SubPocket('sp-g1-2', 'pocket-1', 'Utilities', 150, 1, 0, true, 'group-1');
      const sp3 = new SubPocket('sp-g2-1', 'pocket-1', 'Other', 100, 1, 0, true, 'group-2');

      await repository.save(sp1, testUserId);
      await repository.save(sp2, testUserId);
      await repository.save(sp3, testUserId);

      const subPockets = await repository.findByGroupId('group-1', testUserId);

      expect(subPockets).toHaveLength(2);
      expect(subPockets.map(sp => sp.id)).toContain('sp-g1-1');
      expect(subPockets.map(sp => sp.id)).toContain('sp-g1-2');
    });
  });

  describe('findAllByUserId', () => {
    it('should return empty array when user has no sub-pockets', async () => {
      const subPockets = await repository.findAllByUserId(testUserId);
      expect(subPockets).toEqual([]);
    });

    it('should return all sub-pockets for a user', async () => {
      const sp1 = new SubPocket('sp-all-1', 'pocket-1', 'Rent', 1200, 1, 0);
      const sp2 = new SubPocket('sp-all-2', 'pocket-2', 'Utilities', 150, 1, 0);

      await repository.save(sp1, testUserId);
      await repository.save(sp2, testUserId);

      const subPockets = await repository.findAllByUserId(testUserId);

      expect(subPockets).toHaveLength(2);
    });

    it('should not return sub-pockets from other users', async () => {
      const mySubPocket = new SubPocket('sp-mine', 'pocket-1', 'Mine', 100, 1, 0);
      const otherSubPocket = new SubPocket('sp-other', 'pocket-1', 'Other', 100, 1, 0);

      await repository.save(mySubPocket, testUserId);
      await repository.save(otherSubPocket, 'other-user-id');

      const subPockets = await repository.findAllByUserId(testUserId);

      expect(subPockets).toHaveLength(1);
      expect(subPockets[0].id).toBe('sp-mine');
    });
  });

  describe('update operation', () => {
    it('should update sub-pocket name', async () => {
      const subPocket = new SubPocket('sp-update-1', 'pocket-1', 'Old Name', 100, 1, 0);
      await repository.save(subPocket, testUserId);

      subPocket.update('New Name', undefined, undefined);
      await repository.update(subPocket, testUserId);

      const updated = await repository.findById('sp-update-1', testUserId);
      expect(updated?.name).toBe('New Name');
    });

    it('should update sub-pocket value and periodicity', async () => {
      const subPocket = new SubPocket('sp-update-2', 'pocket-1', 'Test', 100, 1, 0);
      await repository.save(subPocket, testUserId);

      subPocket.update(undefined, 200, 2);
      await repository.update(subPocket, testUserId);

      const updated = await repository.findById('sp-update-2', testUserId);
      expect(updated?.valueTotal).toBe(200);
      expect(updated?.periodicityMonths).toBe(2);
    });

    it('should update sub-pocket balance', async () => {
      const subPocket = new SubPocket('sp-update-3', 'pocket-1', 'Test', 100, 1, 0);
      await repository.save(subPocket, testUserId);

      subPocket.updateBalance(500);
      await repository.update(subPocket, testUserId);

      const updated = await repository.findById('sp-update-3', testUserId);
      expect(updated?.balance).toBe(500);
    });

    it('should update sub-pocket enabled status', async () => {
      const subPocket = new SubPocket('sp-update-4', 'pocket-1', 'Test', 100, 1, 0, true);
      await repository.save(subPocket, testUserId);

      subPocket.toggleEnabled();
      await repository.update(subPocket, testUserId);

      const updated = await repository.findById('sp-update-4', testUserId);
      expect(updated?.enabled).toBe(false);
    });

    it('should update sub-pocket group', async () => {
      const subPocket = new SubPocket('sp-update-5', 'pocket-1', 'Test', 100, 1, 0);
      await repository.save(subPocket, testUserId);

      subPocket.updateGroupId('new-group');
      await repository.update(subPocket, testUserId);

      const updated = await repository.findById('sp-update-5', testUserId);
      expect(updated?.groupId).toBe('new-group');
    });
  });

  describe('delete operation', () => {
    it('should delete an existing sub-pocket', async () => {
      const subPocket = new SubPocket('sp-delete-1', 'pocket-1', 'To Delete', 100, 1, 0);
      await repository.save(subPocket, testUserId);

      await repository.delete('sp-delete-1', testUserId);

      const deleted = await repository.findById('sp-delete-1', testUserId);
      expect(deleted).toBeNull();
    });

    it('should not throw error when deleting non-existent sub-pocket', async () => {
      await expect(repository.delete('non-existent', testUserId)).resolves.not.toThrow();
    });
  });

  describe('updateDisplayOrders operation', () => {
    it('should update display orders for multiple sub-pockets', async () => {
      const sp1 = new SubPocket('sp-order-1', 'pocket-1', 'First', 100, 1, 0);
      const sp2 = new SubPocket('sp-order-2', 'pocket-1', 'Second', 100, 1, 0);
      const sp3 = new SubPocket('sp-order-3', 'pocket-1', 'Third', 100, 1, 0);

      await repository.save(sp1, testUserId);
      await repository.save(sp2, testUserId);
      await repository.save(sp3, testUserId);

      await repository.updateDisplayOrders(['sp-order-3', 'sp-order-1', 'sp-order-2'], testUserId);

      const subPockets = await repository.findByPocketId('pocket-1', testUserId);

      expect(subPockets[0].id).toBe('sp-order-3');
      expect(subPockets[0].displayOrder).toBe(0);
      expect(subPockets[1].id).toBe('sp-order-1');
      expect(subPockets[1].displayOrder).toBe(1);
      expect(subPockets[2].id).toBe('sp-order-2');
      expect(subPockets[2].displayOrder).toBe(2);
    });
  });

  describe('countMovements operation', () => {
    it('should return 0 when sub-pocket has no movements', async () => {
      const count = await repository.countMovements('sp-no-movements', testUserId);
      expect(count).toBe(0);
    });

    // Note: Testing with actual movements would require setting up the movements table
    // This is a basic test to verify the method doesn't throw errors
  });
});
