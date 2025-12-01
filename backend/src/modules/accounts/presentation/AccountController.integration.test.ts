/**
 * Integration Tests for AccountController
 * 
 * These tests verify the complete HTTP request/response flow through the controller,
 * including authentication, validation, and error handling.
 * 
 * Prerequisites:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment
 * - Database must have the accounts table with proper schema
 * - Tests use a test user ID to isolate test data
 */

import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import app from '../../../server';
import type { CreateAccountDTO, UpdateAccountDTO } from '../application/dtos/AccountDTO';
import { setupTestContainer } from './test-setup';

// Skip integration tests if environment variables are not set
const describeIntegration = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? describe
  : describe.skip;

describeIntegration('AccountController Integration Tests', () => {
  let supabase: any;
  let testUserId: string;
  let authToken: string;

  // Setup: Create Supabase client and test user
  beforeAll(async () => {
    // Setup test container with mock dependencies
    setupTestContainer();

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Create a test user for authentication
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Create a real test user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `test-${uniqueId}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authData.user.id;

    // Sign in to get a valid JWT token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: `test-${uniqueId}@example.com`,
      password: 'test-password-123',
    });

    if (signInError || !signInData.session) {
      throw new Error(`Failed to sign in test user: ${signInError?.message}`);
    }

    authToken = signInData.session.access_token;
  });

  // Cleanup: Delete test user and all test data
  afterAll(async () => {
    // Delete test user
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  // Cleanup: Delete all test data after each test
  afterEach(async () => {
    // Delete all accounts created by test user
    await supabase
      .from('accounts')
      .delete()
      .eq('user_id', testUserId);
  });

  describe('POST /api/accounts - Create Account', () => {
    it('should create a normal account successfully', async () => {
      // Arrange
      const dto: CreateAccountDTO = {
        name: 'Test Checking',
        color: '#3b82f6',
        currency: 'USD',
        type: 'normal'
      };

      // Act
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Checking');
      expect(response.body.color).toBe('#3b82f6');
      expect(response.body.currency).toBe('USD');
      expect(response.body.type).toBe('normal');
      expect(response.body.balance).toBe(0);
    });

    it('should create an investment account with stock symbol', async () => {
      // Arrange
      const dto: CreateAccountDTO = {
        name: 'VOO Investment',
        color: '#10b981',
        currency: 'USD',
        type: 'investment',
        stockSymbol: 'VOO'
      };

      // Act
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.type).toBe('investment');
      expect(response.body.stockSymbol).toBe('VOO');
    });

    it('should return 400 for validation errors (empty name)', async () => {
      // Arrange
      const dto: CreateAccountDTO = {
        name: '',
        color: '#3b82f6',
        currency: 'USD'
      };

      // Act
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for validation errors (invalid color)', async () => {
      // Arrange
      const dto: CreateAccountDTO = {
        name: 'Test Account',
        color: 'invalid-color',
        currency: 'USD'
      };

      // Act
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 409 for duplicate account (same name and currency)', async () => {
      // Arrange
      const dto: CreateAccountDTO = {
        name: 'Duplicate Account',
        color: '#3b82f6',
        currency: 'USD'
      };

      // Create first account
      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      // Act - Try to create duplicate
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 when no authentication token provided', async () => {
      // Arrange
      const dto: CreateAccountDTO = {
        name: 'Test Account',
        color: '#3b82f6',
        currency: 'USD'
      };

      // Act
      const response = await request(app)
        .post('/api/accounts')
        .send(dto);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/accounts - Get All Accounts', () => {
    it('should return all accounts for authenticated user', async () => {
      // Arrange - Create multiple accounts
      const accounts = [
        { name: 'Checking', color: '#3b82f6', currency: 'USD' },
        { name: 'Savings', color: '#10b981', currency: 'USD' },
        { name: 'Investment', color: '#8b5cf6', currency: 'USD', type: 'investment', stockSymbol: 'VOO' }
      ];

      for (const account of accounts) {
        await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(account);
      }

      // Act
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body.map((a: any) => a.name)).toContain('Checking');
      expect(response.body.map((a: any) => a.name)).toContain('Savings');
      expect(response.body.map((a: any) => a.name)).toContain('Investment');
    });

    it('should return empty array when user has no accounts', async () => {
      // Act
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return accounts sorted by display order', async () => {
      // Arrange - Create accounts with specific display orders
      const account1 = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Third', color: '#3b82f6', currency: 'USD' });

      const account2 = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'First', color: '#10b981', currency: 'USD' });

      const account3 = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Second', color: '#8b5cf6', currency: 'USD' });

      // Reorder accounts
      await request(app)
        .post('/api/accounts/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ accountIds: [account2.body.id, account3.body.id, account1.body.id] });

      // Act
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body[0].name).toBe('First');
      expect(response.body[1].name).toBe('Second');
      expect(response.body[2].name).toBe('Third');
    });

    it('should return 401 when no authentication token provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/accounts');

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/accounts/:id - Get Account By ID', () => {
    it('should return account by ID for authenticated user', async () => {
      // Arrange - Create an account
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Account', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;

      // Act
      const response = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(accountId);
      expect(response.body.name).toBe('Test Account');
    });

    it('should return 404 when account does not exist', async () => {
      // Act
      const response = await request(app)
        .get('/api/accounts/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 when trying to access another user\'s account', async () => {
      // Arrange - Create account with different user
      const otherUserId = 'other-user-id';
      await supabase
        .from('accounts')
        .insert({
          id: 'other-account-id',
          user_id: otherUserId,
          name: 'Other Account',
          color: '#3b82f6',
          currency: 'USD',
          balance: 0,
          type: 'normal'
        });

      // Act
      const response = await request(app)
        .get('/api/accounts/other-account-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404); // Returns 404 instead of 403 for security
    });

    it('should return 401 when no authentication token provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/accounts/some-id');

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/accounts/:id - Update Account', () => {
    it('should update account name successfully', async () => {
      // Arrange - Create an account
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Old Name', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;
      const updateDto: UpdateAccountDTO = { name: 'New Name' };

      // Act
      const response = await request(app)
        .put(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.color).toBe('#3b82f6'); // Unchanged
    });

    it('should update account color successfully', async () => {
      // Arrange
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Account', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;
      const updateDto: UpdateAccountDTO = { color: '#ef4444' };

      // Act
      const response = await request(app)
        .put(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.color).toBe('#ef4444');
    });

    it('should update account currency successfully', async () => {
      // Arrange
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Account', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;
      const updateDto: UpdateAccountDTO = { currency: 'EUR' };

      // Act
      const response = await request(app)
        .put(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.currency).toBe('EUR');
    });

    it('should return 400 for validation errors (invalid color)', async () => {
      // Arrange
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Account', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;
      const updateDto: UpdateAccountDTO = { color: 'invalid' };

      // Act
      const response = await request(app)
        .put(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 409 when updating to duplicate name/currency combination', async () => {
      // Arrange - Create two accounts
      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account One', color: '#3b82f6', currency: 'USD' });

      const account2Response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account Two', color: '#10b981', currency: 'USD' });

      const account2Id = account2Response.body.id;
      const updateDto: UpdateAccountDTO = { name: 'Account One' }; // Try to use existing name

      // Act
      const response = await request(app)
        .put(`/api/accounts/${account2Id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when account does not exist', async () => {
      // Arrange
      const updateDto: UpdateAccountDTO = { name: 'New Name' };

      // Act
      const response = await request(app)
        .put('/api/accounts/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/accounts/:id - Delete Account', () => {
    it('should delete account successfully when no pockets exist', async () => {
      // Arrange - Create an account
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'To Delete', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;

      // Act
      const response = await request(app)
        .delete(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(204);

      // Verify account was deleted
      const getResponse = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 409 when account has pockets', async () => {
      // Arrange - Create account and pocket
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account With Pocket', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;

      // Create a pocket for this account
      await supabase
        .from('pockets')
        .insert({
          id: 'test-pocket-id',
          user_id: testUserId,
          account_id: accountId,
          name: 'Test Pocket',
          type: 'normal',
          balance: 0,
          currency: 'USD'
        });

      // Act
      const response = await request(app)
        .delete(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when account does not exist', async () => {
      // Act
      const response = await request(app)
        .delete('/api/accounts/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/accounts/:id/cascade - Cascade Delete Account', () => {
    it('should cascade delete with orphan flag (deleteMovements=false)', async () => {
      // Arrange - Create account with pocket and movement
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account To Cascade', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;

      // Create pocket
      await supabase
        .from('pockets')
        .insert({
          id: 'cascade-pocket-id',
          user_id: testUserId,
          account_id: accountId,
          name: 'Test Pocket',
          type: 'normal',
          balance: 100,
          currency: 'USD'
        });

      // Create movement
      await supabase
        .from('movements')
        .insert({
          id: 'cascade-movement-id',
          user_id: testUserId,
          account_id: accountId,
          pocket_id: 'cascade-pocket-id',
          type: 'IngresoNormal',
          amount: 100,
          displayed_date: new Date().toISOString(),
          is_pending: false,
          is_orphaned: false
        });

      // Act
      const response = await request(app)
        .post(`/api/accounts/${accountId}/cascade`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deleteMovements: false });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('account', accountId);
      expect(response.body).toHaveProperty('pockets', 1);
      expect(response.body).toHaveProperty('movements', 1);

      // Verify movement is orphaned
      const { data: movement } = await supabase
        .from('movements')
        .select('is_orphaned')
        .eq('id', 'cascade-movement-id')
        .single();
      expect(movement.is_orphaned).toBe(true);

      // Verify account and pocket are deleted
      const getResponse = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getResponse.status).toBe(404);
    });

    it('should cascade delete with hard delete flag (deleteMovements=true)', async () => {
      // Arrange - Create account with pocket and movement
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account To Hard Delete', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;

      // Create pocket
      await supabase
        .from('pockets')
        .insert({
          id: 'hard-delete-pocket-id',
          user_id: testUserId,
          account_id: accountId,
          name: 'Test Pocket',
          type: 'normal',
          balance: 100,
          currency: 'USD'
        });

      // Create movement
      await supabase
        .from('movements')
        .insert({
          id: 'hard-delete-movement-id',
          user_id: testUserId,
          account_id: accountId,
          pocket_id: 'hard-delete-pocket-id',
          type: 'IngresoNormal',
          amount: 100,
          displayed_date: new Date().toISOString(),
          is_pending: false,
          is_orphaned: false
        });

      // Act
      const response = await request(app)
        .post(`/api/accounts/${accountId}/cascade`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deleteMovements: true });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('account', accountId);
      expect(response.body).toHaveProperty('pockets', 1);
      expect(response.body).toHaveProperty('movements', 1);

      // Verify movement is permanently deleted
      const { data: movement } = await supabase
        .from('movements')
        .select('id')
        .eq('id', 'hard-delete-movement-id')
        .maybeSingle();
      expect(movement).toBeNull();
    });

    it('should cascade delete account with fixed pocket and sub-pockets', async () => {
      // Arrange - Create account with fixed pocket and sub-pockets
      const createResponse = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account With Fixed', color: '#3b82f6', currency: 'USD' });

      const accountId = createResponse.body.id;

      // Create fixed pocket
      await supabase
        .from('pockets')
        .insert({
          id: 'fixed-pocket-id',
          user_id: testUserId,
          account_id: accountId,
          name: 'Fixed Expenses',
          type: 'fixed',
          balance: 0,
          currency: 'USD'
        });

      // Create sub-pockets
      await supabase
        .from('sub_pockets')
        .insert([
          {
            id: 'sub-pocket-1',
            user_id: testUserId,
            pocket_id: 'fixed-pocket-id',
            name: 'Rent',
            value_total: 1000,
            periodicity_months: 1,
            balance: 0
          },
          {
            id: 'sub-pocket-2',
            user_id: testUserId,
            pocket_id: 'fixed-pocket-id',
            name: 'Utilities',
            value_total: 200,
            periodicity_months: 1,
            balance: 0
          }
        ]);

      // Act
      const response = await request(app)
        .post(`/api/accounts/${accountId}/cascade`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deleteMovements: true });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pockets', 1);
      expect(response.body).toHaveProperty('subPockets', 2);
    });

    it('should return 404 when account does not exist', async () => {
      // Act
      const response = await request(app)
        .post('/api/accounts/non-existent-id/cascade')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deleteMovements: false });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/accounts/reorder - Reorder Accounts', () => {
    it('should reorder accounts successfully', async () => {
      // Arrange - Create three accounts
      const account1 = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account 1', color: '#3b82f6', currency: 'USD' });

      const account2 = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account 2', color: '#10b981', currency: 'USD' });

      const account3 = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account 3', color: '#8b5cf6', currency: 'USD' });

      // Act - Reorder: 3, 1, 2
      const response = await request(app)
        .post('/api/accounts/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ accountIds: [account3.body.id, account1.body.id, account2.body.id] });

      // Assert
      expect(response.status).toBe(204);

      // Verify order
      const getResponse = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body[0].id).toBe(account3.body.id);
      expect(getResponse.body[0].displayOrder).toBe(0);
      expect(getResponse.body[1].id).toBe(account1.body.id);
      expect(getResponse.body[1].displayOrder).toBe(1);
      expect(getResponse.body[2].id).toBe(account2.body.id);
      expect(getResponse.body[2].displayOrder).toBe(2);
    });

    it('should return 400 when accountIds is empty', async () => {
      // Act
      const response = await request(app)
        .post('/api/accounts/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ accountIds: [] });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 404 when one or more accounts do not exist', async () => {
      // Arrange - Create one account
      const account1 = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Account 1', color: '#3b82f6', currency: 'USD' });

      // Act - Try to reorder with non-existent account
      const response = await request(app)
        .post('/api/accounts/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ accountIds: [account1.body.id, 'non-existent-id'] });

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 403 when trying to reorder accounts from different users', async () => {
      // Arrange - Create account for current user
      const myAccount = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'My Account', color: '#3b82f6', currency: 'USD' });

      // Create account for different user
      await supabase
        .from('accounts')
        .insert({
          id: 'other-user-account',
          user_id: 'other-user-id',
          name: 'Other Account',
          color: '#10b981',
          currency: 'USD',
          balance: 0,
          type: 'normal'
        });

      // Act - Try to reorder with other user's account
      const response = await request(app)
        .post('/api/accounts/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ accountIds: [myAccount.body.id, 'other-user-account'] });

      // Assert
      expect(response.status).toBe(403);
    });
  });
});
