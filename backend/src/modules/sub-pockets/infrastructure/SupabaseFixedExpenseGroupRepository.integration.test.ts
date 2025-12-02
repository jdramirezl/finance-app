/**
 * Integration Tests for SupabaseFixedExpenseGroupRepository
 * 
 * These tests interact with a real Supabase database to verify repository operations.
 * They test the actual database interactions, not mocked behavior.
 * 
 * Prerequisites:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment
 * - Database must have the fixed_expense_groups table with proper schema
 * - Tests use a test user ID to isolate test data
 */

import 'reflect-metadata';
import { SupabaseFixedExpenseGroupRepository } from './SupabaseFixedExpenseGroupRepository';
import { FixedExpenseGroup } from '../domain/FixedExpenseGroup';
import { DatabaseError } from '../../../shared/errors/AppError';
import { createClient } from '@supabase/supabase-js';

// Skip integration tests by default (they require real database)
const describeIntegration = 
  process.env.RUN_INTEGRATION_TESTS === 'true' && 
  process.env.SUPABASE_URL && 
  process.env.SUPABASE_SERVICE_KEY
    ? describe
    : describe.skip;

describeIntegration('SupabaseFixedExpenseGroupRepository Integration Tests', () => {
  let repository: SupabaseFixedExpenseGroupRepository;
  let testUserId: string;
  let supabase: any;

  beforeAll(() => {
    repository = new SupabaseFixedExpenseGroupRepository();
    testUserId = `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  });

  afterEach(async () => {
    // Delete all groups created by test user
    await supabase
      .from('fixed_expense_groups')
      .delete()
      .eq('user_id', testUserId);
  });

  describe('save operation', () => {
    it('should save a group to the database', async () => {
      const group = new FixedExpenseGroup(
        'group-1',
        'Monthly Bills',
        '#3b82f6'
      );

      await repository.save(group, testUserId);

      const saved = await repository.findById('group-1', testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe('group-1');
      expect(saved?.name).toBe('Monthly Bills');
      expect(saved?.color).toBe('#3b82f6');
    });

    it('should save a group with different color', async () => {
      const group = new FixedExpenseGroup(
        'group-2',
        'Annual Expenses',
        '#ef4444'
      );

      await repository.save(group, testUserId);

      const saved = await repository.findById('group-2', testUserId);
      expect(saved?.color).toBe('#ef4444');
    });

    it('should throw DatabaseError when saving duplicate ID', async () => {
      const group1 = new FixedExpenseGroup('group-dup', 'First', '#3b82f6');
      const group2 = new FixedExpenseGroup('group-dup', 'Second', '#ef4444');

      await repository.save(group1, testUserId);
      await expect(repository.save(group2, testUserId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('findById operation', () => {
    it('should find an existing group by ID', async () => {
      const group = new FixedExpenseGroup('group-find-1', 'Utilities', '#10b981');
      await repository.save(group, testUserId);

      const found = await repository.findById('group-find-1', testUserId);

      expect(found).not.toBeNull();
      expect(found?.id).toBe('group-find-1');
      expect(found?.name).toBe('Utilities');
      expect(found?.color).toBe('#10b981');
    });

    it('should return null when group does not exist', async () => {
      const found = await repository.findById('non-existent', testUserId);
      expect(found).toBeNull();
    });

    it('should return null when group belongs to different user', async () => {
      const group = new FixedExpenseGroup('group-other', 'Private', '#3b82f6');
      await repository.save(group, 'other-user-id');

      const found = await repository.findById('group-other', testUserId);
      expect(found).toBeNull();
    });
  });

  describe('findAllByUserId', () => {
    it('should return empty array when user has no groups', async () => {
      const groups = await repository.findAllByUserId(testUserId);
      expect(groups).toEqual([]);
    });

    it('should return all groups for a user', async () => {
      const group1 = new FixedExpenseGroup('group-all-1', 'Monthly', '#3b82f6');
      const group2 = new FixedExpenseGroup('group-all-2', 'Annual', '#10b981');
      const group3 = new FixedExpenseGroup('group-all-3', 'Quarterly', '#8b5cf6');

      await repository.save(group1, testUserId);
      await repository.save(group2, testUserId);
      await repository.save(group3, testUserId);

      const groups = await repository.findAllByUserId(testUserId);

      expect(groups).toHaveLength(3);
      expect(groups.map(g => g.id)).toContain('group-all-1');
      expect(groups.map(g => g.id)).toContain('group-all-2');
      expect(groups.map(g => g.id)).toContain('group-all-3');
    });

    it('should sort groups by name ascending', async () => {
      const group1 = new FixedExpenseGroup('group-sort-1', 'Zebra', '#3b82f6');
      const group2 = new FixedExpenseGroup('group-sort-2', 'Alpha', '#10b981');
      const group3 = new FixedExpenseGroup('group-sort-3', 'Beta', '#8b5cf6');

      await repository.save(group1, testUserId);
      await repository.save(group2, testUserId);
      await repository.save(group3, testUserId);

      const groups = await repository.findAllByUserId(testUserId);

      expect(groups).toHaveLength(3);
      expect(groups[0].name).toBe('Alpha');
      expect(groups[1].name).toBe('Beta');
      expect(groups[2].name).toBe('Zebra');
    });

    it('should not return groups from other users', async () => {
      const myGroup = new FixedExpenseGroup('group-mine', 'My Group', '#3b82f6');
      const otherGroup = new FixedExpenseGroup('group-other', 'Other Group', '#10b981');

      await repository.save(myGroup, testUserId);
      await repository.save(otherGroup, 'other-user-id');

      const groups = await repository.findAllByUserId(testUserId);

      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('group-mine');
    });
  });

  describe('update operation', () => {
    it('should update group name', async () => {
      const group = new FixedExpenseGroup('group-update-1', 'Old Name', '#3b82f6');
      await repository.save(group, testUserId);

      group.update('New Name', undefined);
      await repository.update(group, testUserId);

      const updated = await repository.findById('group-update-1', testUserId);
      expect(updated?.name).toBe('New Name');
    });

    it('should update group color', async () => {
      const group = new FixedExpenseGroup('group-update-2', 'Test', '#3b82f6');
      await repository.save(group, testUserId);

      group.update(undefined, '#ef4444');
      await repository.update(group, testUserId);

      const updated = await repository.findById('group-update-2', testUserId);
      expect(updated?.color).toBe('#ef4444');
    });

    it('should update both name and color', async () => {
      const group = new FixedExpenseGroup('group-update-3', 'Old', '#3b82f6');
      await repository.save(group, testUserId);

      group.update('New', '#10b981');
      await repository.update(group, testUserId);

      const updated = await repository.findById('group-update-3', testUserId);
      expect(updated?.name).toBe('New');
      expect(updated?.color).toBe('#10b981');
    });

    it('should not update groups from other users', async () => {
      const group = new FixedExpenseGroup('group-update-4', 'Original', '#3b82f6');
      await repository.save(group, 'other-user-id');

      group.update('Modified', undefined);
      await repository.update(group, testUserId);

      // Verify it wasn't updated
      const { data } = await supabase
        .from('fixed_expense_groups')
        .select('name')
        .eq('id', 'group-update-4')
        .single();
      
      expect(data.name).toBe('Original');
    });
  });

  describe('delete operation', () => {
    it('should delete an existing group', async () => {
      const group = new FixedExpenseGroup('group-delete-1', 'To Delete', '#3b82f6');
      await repository.save(group, testUserId);

      await repository.delete('group-delete-1', testUserId);

      const deleted = await repository.findById('group-delete-1', testUserId);
      expect(deleted).toBeNull();
    });

    it('should not throw error when deleting non-existent group', async () => {
      await expect(repository.delete('non-existent', testUserId)).resolves.not.toThrow();
    });

    it('should not delete groups from other users', async () => {
      const group = new FixedExpenseGroup('group-delete-2', 'Protected', '#3b82f6');
      await repository.save(group, 'other-user-id');

      await repository.delete('group-delete-2', testUserId);

      // Verify it still exists
      const { data } = await supabase
        .from('fixed_expense_groups')
        .select('id')
        .eq('id', 'group-delete-2')
        .single();
      
      expect(data).not.toBeNull();
      expect(data.id).toBe('group-delete-2');
    });

    it('should allow re-creating group with same ID after deletion', async () => {
      const group1 = new FixedExpenseGroup('group-delete-3', 'First', '#3b82f6');
      await repository.save(group1, testUserId);
      await repository.delete('group-delete-3', testUserId);

      const group2 = new FixedExpenseGroup('group-delete-3', 'Second', '#ef4444');
      await repository.save(group2, testUserId);

      const recreated = await repository.findById('group-delete-3', testUserId);
      expect(recreated).not.toBeNull();
      expect(recreated?.name).toBe('Second');
      expect(recreated?.color).toBe('#ef4444');
    });
  });
});
