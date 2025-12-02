/**
 * Integration Tests for SupabasePocketRepository
 * 
 * These tests interact with a real Supabase database to verify repository operations.
 */

import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { SupabasePocketRepository } from './SupabasePocketRepository';
import { Pocket } from '../domain/Pocket';
import { DatabaseError } from '../../../shared/errors/AppError';
import { createClient } from '@supabase/supabase-js';

// Skip integration tests by default (they require real database)
// To run these tests, set RUN_INTEGRATION_TESTS=true in addition to Supabase credentials
const describeIntegration = 
  process.env.RUN_INTEGRATION_TESTS === 'true' && 
  process.env.SUPABASE_URL && 
  process.env.SUPABASE_SERVICE_KEY
    ? describe
    : describe.skip;

describeIntegration('SupabasePocketRepository Integration Tests', () => {
  let repository: SupabasePocketRepository;
  let testUserId: string;
  let testAccountId: string;
  let supabase: any;

  beforeAll(async () => {
    repository = new SupabasePocketRepository();
    testUserId = randomUUID();
    testAccountId = randomUUID();
    
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Create a test user in auth.users table (required for foreign key constraints)
    // Insert directly using SQL since we have service key
    try {
      await supabase.rpc('exec_sql', {
        sql: `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
              VALUES ('${testUserId}', 'test-${testUserId}@example.com', crypt('test-password', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"test":true}', 'authenticated', 'authenticated')
              ON CONFLICT (id) DO NOTHING`
      });
    } catch (error) {
      // If RPC doesn't exist, try direct insert (may fail due to RLS)
      // This is okay - tests will skip if setup fails
    }
  });

  beforeEach(async () => {
    // Create a test account for pockets to reference
    await supabase
      .from('accounts')
      .insert({
        id: testAccountId,
        user_id: testUserId,
        name: 'Test Account',
        color: '#3b82f6',
        currency: 'USD',
        balance: 0,
        type: 'normal',
      });
  });

  afterEach(async () => {
    await supabase.from('pockets').delete().eq('user_id', testUserId);
    await supabase.from('accounts').delete().eq('user_id', testUserId);
  });

  afterAll(async () => {
    // Clean up test user
    try {
      await supabase.auth.admin.deleteUser(testUserId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('save and findById', () => {
    it('should save and retrieve a pocket', async () => {
      const pocketId = randomUUID();
      const pocket = new Pocket(pocketId, testAccountId, 'Groceries', 'normal', 0, 'USD');
      
      await repository.save(pocket, testUserId);
      
      const saved = await repository.findById(pocketId, testUserId);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe(pocketId);
      expect(saved?.name).toBe('Groceries');
    });

    it('should return null for non-existent pocket', async () => {
      const found = await repository.findById(randomUUID(), testUserId);
      expect(found).toBeNull();
    });
  });

  describe('findByAccountId', () => {
    it('should return all pockets for an account sorted by display order', async () => {
      const pocket1 = new Pocket(randomUUID(), testAccountId, 'Third', 'normal', 0, 'USD', 2);
      const pocket2 = new Pocket(randomUUID(), testAccountId, 'First', 'normal', 0, 'USD', 0);
      const pocket3 = new Pocket(randomUUID(), testAccountId, 'Second', 'normal', 0, 'USD', 1);

      await repository.save(pocket1, testUserId);
      await repository.save(pocket2, testUserId);
      await repository.save(pocket3, testUserId);

      const pockets = await repository.findByAccountId(testAccountId, testUserId);
      
      expect(pockets).toHaveLength(3);
      expect(pockets[0].name).toBe('First');
      expect(pockets[1].name).toBe('Second');
      expect(pockets[2].name).toBe('Third');
    });
  });

  describe('existsByNameInAccount', () => {
    it('should return true when pocket exists', async () => {
      const pocket = new Pocket(randomUUID(), testAccountId, 'Groceries', 'normal', 0, 'USD');
      await repository.save(pocket, testUserId);

      const exists = await repository.existsByNameInAccount('Groceries', testAccountId, testUserId);
      expect(exists).toBe(true);
    });

    it('should return false when pocket does not exist', async () => {
      const exists = await repository.existsByNameInAccount('NonExistent', testAccountId, testUserId);
      expect(exists).toBe(false);
    });
  });

  describe('existsFixedPocketForUser', () => {
    it('should return true when user has a fixed pocket', async () => {
      const pocket = new Pocket(randomUUID(), testAccountId, 'Fixed', 'fixed', 0, 'USD');
      await repository.save(pocket, testUserId);

      const exists = await repository.existsFixedPocketForUser(testUserId);
      expect(exists).toBe(true);
    });

    it('should return false when user has no fixed pocket', async () => {
      const exists = await repository.existsFixedPocketForUser(testUserId);
      expect(exists).toBe(false);
    });
  });

  describe('update', () => {
    it('should update pocket name', async () => {
      const pocketId = randomUUID();
      const pocket = new Pocket(pocketId, testAccountId, 'Old Name', 'normal', 0, 'USD');
      await repository.save(pocket, testUserId);

      pocket.update('New Name');
      await repository.update(pocket, testUserId);

      const updated = await repository.findById(pocketId, testUserId);
      expect(updated?.name).toBe('New Name');
    });

    it('should update pocket balance', async () => {
      const pocketId = randomUUID();
      const pocket = new Pocket(pocketId, testAccountId, 'Test', 'normal', 0, 'USD');
      await repository.save(pocket, testUserId);

      pocket.updateBalance(5000);
      await repository.update(pocket, testUserId);

      const updated = await repository.findById(pocketId, testUserId);
      expect(updated?.balance).toBe(5000);
    });
  });

  describe('delete', () => {
    it('should delete an existing pocket', async () => {
      const pocketId = randomUUID();
      const pocket = new Pocket(pocketId, testAccountId, 'To Delete', 'normal', 0, 'USD');
      await repository.save(pocket, testUserId);

      await repository.delete(pocketId, testUserId);

      const deleted = await repository.findById(pocketId, testUserId);
      expect(deleted).toBeNull();
    });
  });

  describe('updateDisplayOrders', () => {
    it('should update display orders for multiple pockets', async () => {
      const id1 = randomUUID();
      const id2 = randomUUID();
      const id3 = randomUUID();

      await repository.save(new Pocket(id1, testAccountId, 'First', 'normal', 0, 'USD'), testUserId);
      await repository.save(new Pocket(id2, testAccountId, 'Second', 'normal', 0, 'USD'), testUserId);
      await repository.save(new Pocket(id3, testAccountId, 'Third', 'normal', 0, 'USD'), testUserId);

      // Reorder: 3, 1, 2
      await repository.updateDisplayOrders([id3, id1, id2], testUserId);

      const pockets = await repository.findByAccountId(testAccountId, testUserId);
      expect(pockets[0].id).toBe(id3);
      expect(pockets[0].displayOrder).toBe(0);
      expect(pockets[1].id).toBe(id1);
      expect(pockets[1].displayOrder).toBe(1);
      expect(pockets[2].id).toBe(id2);
      expect(pockets[2].displayOrder).toBe(2);
    });
  });
});
