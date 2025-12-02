/**
 * Integration Tests for AccountController
 * 
 * These tests verify the HTTP request/response flow through the controller,
 * including request validation, response formatting, and error handling.
 * 
 * Note: Use cases are mocked to avoid database dependencies.
 * For database integration tests, see SupabaseAccountRepository.integration.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import type { CreateAccountDTO, UpdateAccountDTO } from '../application/dtos/AccountDTO';
import { AccountController } from './AccountController';
import { CreateAccountUseCase } from '../application/useCases/CreateAccountUseCase';
import { GetAllAccountsUseCase } from '../application/useCases/GetAllAccountsUseCase';
import { GetAccountByIdUseCase } from '../application/useCases/GetAccountByIdUseCase';
import { UpdateAccountUseCase } from '../application/useCases/UpdateAccountUseCase';
import { DeleteAccountUseCase } from '../application/useCases/DeleteAccountUseCase';
import { DeleteAccountCascadeUseCase } from '../application/useCases/DeleteAccountCascadeUseCase';
import { ReorderAccountsUseCase } from '../application/useCases/ReorderAccountsUseCase';
import { ValidationError, ConflictError, NotFoundError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('AccountController Integration Tests', () => {
  let app: express.Application;
  let mockCreateAccountUseCase: jest.Mocked<CreateAccountUseCase>;
  let mockGetAllAccountsUseCase: jest.Mocked<GetAllAccountsUseCase>;
  let mockGetAccountByIdUseCase: jest.Mocked<GetAccountByIdUseCase>;
  let mockUpdateAccountUseCase: jest.Mocked<UpdateAccountUseCase>;
  let mockDeleteAccountUseCase: jest.Mocked<DeleteAccountUseCase>;
  let mockDeleteAccountCascadeUseCase: jest.Mocked<DeleteAccountCascadeUseCase>;
  let mockReorderAccountsUseCase: jest.Mocked<ReorderAccountsUseCase>;
  
  const testUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: testUserId };
    next();
  };

  beforeEach(() => {
    // Create mock use cases
    mockCreateAccountUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetAllAccountsUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetAccountByIdUseCase = {
      execute: jest.fn()
    } as any;
    
    mockUpdateAccountUseCase = {
      execute: jest.fn()
    } as any;
    
    mockDeleteAccountUseCase = {
      execute: jest.fn()
    } as any;
    
    mockDeleteAccountCascadeUseCase = {
      execute: jest.fn()
    } as any;
    
    mockReorderAccountsUseCase = {
      execute: jest.fn()
    } as any;

    // Create controller with mocked use cases
    const controller = new AccountController(
      mockCreateAccountUseCase,
      mockGetAllAccountsUseCase,
      mockGetAccountByIdUseCase,
      mockUpdateAccountUseCase,
      mockDeleteAccountUseCase,
      mockDeleteAccountCascadeUseCase,
      mockReorderAccountsUseCase
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    const router = express.Router();
    router.post('/', (req, res, next) => controller.create(req, res, next));
    router.get('/', (req, res, next) => controller.getAll(req, res, next));
    router.get('/:id', (req, res, next) => controller.getById(req, res, next));
    router.put('/:id', (req, res, next) => controller.update(req, res, next));
    router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
    router.post('/:id/cascade', (req, res, next) => controller.deleteCascade(req, res, next));
    router.post('/reorder', (req, res, next) => controller.reorder(req, res, next));
    
    app.use('/api/accounts', router);
    app.use(errorHandler);
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

      const mockResponse = {
        id: 'account-123',
        name: 'Test Checking',
        color: '#3b82f6',
        currency: 'USD',
        type: 'normal',
        balance: 0
      };

      mockCreateAccountUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .post('/api/accounts')
        .send(dto);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
      expect(mockCreateAccountUseCase.execute).toHaveBeenCalledWith(dto, testUserId);
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

      const mockResponse = {
        id: 'account-456',
        name: 'VOO Investment',
        color: '#10b981',
        currency: 'USD',
        type: 'investment',
        stockSymbol: 'VOO',
        balance: 0
      };

      mockCreateAccountUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .post('/api/accounts')
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

      mockCreateAccountUseCase.execute.mockRejectedValue(
        new ValidationError('Account name is required')
      );

      // Act
      const response = await request(app)
        .post('/api/accounts')
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Account name is required');
    });

    it('should return 409 for duplicate account', async () => {
      // Arrange
      const dto: CreateAccountDTO = {
        name: 'Duplicate Account',
        color: '#3b82f6',
        currency: 'USD'
      };

      mockCreateAccountUseCase.execute.mockRejectedValue(
        new ConflictError('Account with this name and currency already exists')
      );

      // Act
      const response = await request(app)
        .post('/api/accounts')
        .send(dto);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /api/accounts - Get All Accounts', () => {
    it('should return all accounts for authenticated user', async () => {
      // Arrange
      const mockAccounts = [
        { id: '1', name: 'Checking', color: '#3b82f6', currency: 'USD', balance: 1000, type: 'normal' },
        { id: '2', name: 'Savings', color: '#10b981', currency: 'USD', balance: 5000, type: 'normal' },
        { id: '3', name: 'Investment', color: '#8b5cf6', currency: 'USD', balance: 10000, type: 'investment', stockSymbol: 'VOO' }
      ];

      mockGetAllAccountsUseCase.execute.mockResolvedValue(mockAccounts as any);

      // Act
      const response = await request(app)
        .get('/api/accounts');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(mockGetAllAccountsUseCase.execute).toHaveBeenCalledWith(testUserId, false);
    });

    it('should return empty array when user has no accounts', async () => {
      // Arrange
      mockGetAllAccountsUseCase.execute.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/api/accounts');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/accounts/:id - Get Account By ID', () => {
    it('should return account by ID', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        name: 'Test Account',
        color: '#3b82f6',
        currency: 'USD',
        balance: 1000,
        type: 'normal'
      };

      mockGetAccountByIdUseCase.execute.mockResolvedValue(mockAccount as any);

      // Act
      const response = await request(app)
        .get('/api/accounts/account-123');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAccount);
      expect(mockGetAccountByIdUseCase.execute).toHaveBeenCalledWith('account-123', testUserId);
    });

    it('should return 404 when account does not exist', async () => {
      // Arrange
      mockGetAccountByIdUseCase.execute.mockRejectedValue(
        new NotFoundError('Account not found')
      );

      // Act
      const response = await request(app)
        .get('/api/accounts/non-existent-id');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/accounts/:id - Update Account', () => {
    it('should update account successfully', async () => {
      // Arrange
      const dto: UpdateAccountDTO = {
        name: 'Updated Name',
        color: '#10b981'
      };

      const mockResponse = {
        id: 'account-123',
        name: 'Updated Name',
        color: '#10b981',
        currency: 'USD',
        balance: 1000,
        type: 'normal'
      };

      mockUpdateAccountUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .put('/api/accounts/account-123')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(mockUpdateAccountUseCase.execute).toHaveBeenCalledWith('account-123', dto, testUserId);
    });

    it('should return 404 when updating non-existent account', async () => {
      // Arrange
      mockUpdateAccountUseCase.execute.mockRejectedValue(
        new NotFoundError('Account not found')
      );

      // Act
      const response = await request(app)
        .put('/api/accounts/non-existent-id')
        .send({ name: 'New Name' });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/accounts/:id - Delete Account', () => {
    it('should delete account successfully', async () => {
      // Arrange
      mockDeleteAccountUseCase.execute.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .delete('/api/accounts/account-123');

      // Assert
      expect(response.status).toBe(204);
      expect(mockDeleteAccountUseCase.execute).toHaveBeenCalledWith('account-123', testUserId);
    });

    it('should return 404 when deleting non-existent account', async () => {
      // Arrange
      mockDeleteAccountUseCase.execute.mockRejectedValue(
        new NotFoundError('Account not found')
      );

      // Act
      const response = await request(app)
        .delete('/api/accounts/non-existent-id');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/accounts/:id/cascade - Cascade Delete', () => {
    it('should cascade delete account with all related data', async () => {
      // Arrange
      const mockResult = {
        account: 'account-123',
        pockets: 2,
        subPockets: 5,
        movements: 10
      };

      mockDeleteAccountCascadeUseCase.execute.mockResolvedValue(mockResult as any);

      // Act
      const response = await request(app)
        .post('/api/accounts/account-123/cascade')
        .send({ deleteMovements: false });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockDeleteAccountCascadeUseCase.execute).toHaveBeenCalledWith(
        'account-123',
        { deleteMovements: false },
        testUserId
      );
    });
  });

  describe('POST /api/accounts/reorder - Reorder Accounts', () => {
    it('should reorder accounts successfully', async () => {
      // Arrange
      const accountIds = ['account-1', 'account-2', 'account-3'];
      mockReorderAccountsUseCase.execute.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/api/accounts/reorder')
        .send({ accountIds });

      // Assert
      expect(response.status).toBe(204);
      expect(mockReorderAccountsUseCase.execute).toHaveBeenCalledWith(
        { accountIds },
        testUserId
      );
    });
  });
});
