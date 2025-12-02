/**
 * Integration Tests for PocketController
 * 
 * These tests verify the HTTP request/response flow through the controller,
 * including request validation, response formatting, and error handling.
 * 
 * Note: Use cases are mocked to avoid database dependencies.
 * For database integration tests, see SupabasePocketRepository.integration.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import type { CreatePocketDTO, UpdatePocketDTO, MigratePocketDTO } from '../application/dtos/PocketDTO';
import { PocketController } from './PocketController';
import { CreatePocketUseCase } from '../application/useCases/CreatePocketUseCase';
import { GetPocketsByAccountUseCase } from '../application/useCases/GetPocketsByAccountUseCase';
import { GetPocketByIdUseCase } from '../application/useCases/GetPocketByIdUseCase';
import { UpdatePocketUseCase } from '../application/useCases/UpdatePocketUseCase';
import { DeletePocketUseCase } from '../application/useCases/DeletePocketUseCase';
import { MigrateFixedPocketUseCase } from '../application/useCases/MigrateFixedPocketUseCase';
import { ReorderPocketsUseCase } from '../application/useCases/ReorderPocketsUseCase';
import { ValidationError, ConflictError, NotFoundError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('PocketController Integration Tests', () => {
  let app: express.Application;
  let mockCreatePocketUseCase: jest.Mocked<CreatePocketUseCase>;
  let mockGetPocketsByAccountUseCase: jest.Mocked<GetPocketsByAccountUseCase>;
  let mockGetPocketByIdUseCase: jest.Mocked<GetPocketByIdUseCase>;
  let mockUpdatePocketUseCase: jest.Mocked<UpdatePocketUseCase>;
  let mockDeletePocketUseCase: jest.Mocked<DeletePocketUseCase>;
  let mockMigrateFixedPocketUseCase: jest.Mocked<MigrateFixedPocketUseCase>;
  let mockReorderPocketsUseCase: jest.Mocked<ReorderPocketsUseCase>;
  
  const testUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: testUserId };
    next();
  };

  beforeEach(() => {
    // Create mock use cases
    mockCreatePocketUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetPocketsByAccountUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetPocketByIdUseCase = {
      execute: jest.fn()
    } as any;
    
    mockUpdatePocketUseCase = {
      execute: jest.fn()
    } as any;
    
    mockDeletePocketUseCase = {
      execute: jest.fn()
    } as any;
    
    mockMigrateFixedPocketUseCase = {
      execute: jest.fn()
    } as any;
    
    mockReorderPocketsUseCase = {
      execute: jest.fn()
    } as any;

    // Create controller with mocked use cases
    const controller = new PocketController(
      mockCreatePocketUseCase,
      mockGetPocketsByAccountUseCase,
      mockGetPocketByIdUseCase,
      mockUpdatePocketUseCase,
      mockDeletePocketUseCase,
      mockMigrateFixedPocketUseCase,
      mockReorderPocketsUseCase
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    const router = express.Router();
    router.post('/', (req, res, next) => controller.create(req, res, next));
    router.get('/', (req, res, next) => controller.getByAccount(req, res, next));
    router.get('/:id', (req, res, next) => controller.getById(req, res, next));
    router.put('/:id', (req, res, next) => controller.update(req, res, next));
    router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
    router.post('/:id/migrate', (req, res, next) => controller.migrate(req, res, next));
    router.post('/reorder', (req, res, next) => controller.reorder(req, res, next));
    
    app.use('/api/pockets', router);
    app.use(errorHandler);
  });

  describe('POST /api/pockets - Create Pocket', () => {
    it('should create a normal pocket successfully', async () => {
      // Arrange
      const dto: CreatePocketDTO = {
        accountId: 'account-123',
        name: 'Groceries',
        type: 'normal',
        currency: 'USD'
      };

      const mockResponse = {
        id: 'pocket-123',
        accountId: 'account-123',
        name: 'Groceries',
        type: 'normal',
        currency: 'USD',
        balance: 0
      };

      mockCreatePocketUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .post('/api/pockets')
        .send(dto);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
      expect(mockCreatePocketUseCase.execute).toHaveBeenCalledWith(dto, testUserId);
    });

    it('should create a fixed pocket successfully', async () => {
      // Arrange
      const dto: CreatePocketDTO = {
        accountId: 'account-123',
        name: 'Fixed Expenses',
        type: 'fixed',
        currency: 'USD'
      };

      const mockResponse = {
        id: 'pocket-456',
        accountId: 'account-123',
        name: 'Fixed Expenses',
        type: 'fixed',
        currency: 'USD',
        balance: 0
      };

      mockCreatePocketUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .post('/api/pockets')
        .send(dto);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.type).toBe('fixed');
    });

    it('should return 400 for validation errors (empty name)', async () => {
      // Arrange
      const dto: CreatePocketDTO = {
        accountId: 'account-123',
        name: '',
        type: 'normal',
        currency: 'USD'
      };

      mockCreatePocketUseCase.execute.mockRejectedValue(
        new ValidationError('Pocket name is required')
      );

      // Act
      const response = await request(app)
        .post('/api/pockets')
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Pocket name is required');
    });

    it('should return 409 for duplicate pocket name in account', async () => {
      // Arrange
      const dto: CreatePocketDTO = {
        accountId: 'account-123',
        name: 'Duplicate Pocket',
        type: 'normal',
        currency: 'USD'
      };

      mockCreatePocketUseCase.execute.mockRejectedValue(
        new ConflictError('Pocket with this name already exists in account')
      );

      // Act
      const response = await request(app)
        .post('/api/pockets')
        .send(dto);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already exists');
    });

    it('should return 409 when creating second fixed pocket', async () => {
      // Arrange
      const dto: CreatePocketDTO = {
        accountId: 'account-123',
        name: 'Second Fixed',
        type: 'fixed',
        currency: 'USD'
      };

      mockCreatePocketUseCase.execute.mockRejectedValue(
        new ConflictError('User already has a fixed pocket')
      );

      // Act
      const response = await request(app)
        .post('/api/pockets')
        .send(dto);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already has a fixed pocket');
    });
  });

  describe('GET /api/pockets/account/:accountId - Get Pockets By Account', () => {
    it('should return all pockets for an account', async () => {
      // Arrange
      const mockPockets = [
        { id: '1', accountId: 'account-123', name: 'Groceries', type: 'normal', balance: 500, currency: 'USD' },
        { id: '2', accountId: 'account-123', name: 'Entertainment', type: 'normal', balance: 200, currency: 'USD' }
      ];

      mockGetPocketsByAccountUseCase.execute.mockResolvedValue(mockPockets as any);

      // Act
      const response = await request(app)
        .get('/api/pockets?accountId=account-123');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(mockGetPocketsByAccountUseCase.execute).toHaveBeenCalledWith('account-123', testUserId);
    });

    it('should return empty array when account has no pockets', async () => {
      // Arrange
      mockGetPocketsByAccountUseCase.execute.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/api/pockets?accountId=account-123');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/pockets/:id - Get Pocket By ID', () => {
    it('should return pocket by ID', async () => {
      // Arrange
      const mockPocket = {
        id: 'pocket-123',
        accountId: 'account-123',
        name: 'Groceries',
        type: 'normal',
        balance: 500,
        currency: 'USD'
      };

      mockGetPocketByIdUseCase.execute.mockResolvedValue(mockPocket as any);

      // Act
      const response = await request(app)
        .get('/api/pockets/pocket-123');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPocket);
      expect(mockGetPocketByIdUseCase.execute).toHaveBeenCalledWith('pocket-123', testUserId);
    });

    it('should return 404 when pocket does not exist', async () => {
      // Arrange
      mockGetPocketByIdUseCase.execute.mockRejectedValue(
        new NotFoundError('Pocket not found')
      );

      // Act
      const response = await request(app)
        .get('/api/pockets/non-existent-id');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/pockets/:id - Update Pocket', () => {
    it('should update pocket successfully', async () => {
      // Arrange
      const dto: UpdatePocketDTO = {
        name: 'Updated Name'
      };

      const mockResponse = {
        id: 'pocket-123',
        accountId: 'account-123',
        name: 'Updated Name',
        type: 'normal',
        balance: 500,
        currency: 'USD'
      };

      mockUpdatePocketUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .put('/api/pockets/pocket-123')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(mockUpdatePocketUseCase.execute).toHaveBeenCalledWith('pocket-123', dto, testUserId);
    });

    it('should return 404 when updating non-existent pocket', async () => {
      // Arrange
      mockUpdatePocketUseCase.execute.mockRejectedValue(
        new NotFoundError('Pocket not found')
      );

      // Act
      const response = await request(app)
        .put('/api/pockets/non-existent-id')
        .send({ name: 'New Name' });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/pockets/:id - Delete Pocket', () => {
    it('should delete pocket successfully', async () => {
      // Arrange
      mockDeletePocketUseCase.execute.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .delete('/api/pockets/pocket-123');

      // Assert
      expect(response.status).toBe(204);
      expect(mockDeletePocketUseCase.execute).toHaveBeenCalledWith('pocket-123', testUserId);
    });

    it('should return 404 when deleting non-existent pocket', async () => {
      // Arrange
      mockDeletePocketUseCase.execute.mockRejectedValue(
        new NotFoundError('Pocket not found')
      );

      // Act
      const response = await request(app)
        .delete('/api/pockets/non-existent-id');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/pockets/:id/migrate - Migrate Fixed Pocket', () => {
    it('should migrate fixed pocket to new account', async () => {
      // Arrange
      const dto: MigratePocketDTO = {
        targetAccountId: 'account-456'
      };

      mockMigrateFixedPocketUseCase.execute.mockResolvedValue(undefined as any);

      // Act
      const response = await request(app)
        .post('/api/pockets/pocket-123/migrate')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(mockMigrateFixedPocketUseCase.execute).toHaveBeenCalledWith(
        'pocket-123',
        dto,
        testUserId
      );
    });
  });

  describe('POST /api/pockets/reorder - Reorder Pockets', () => {
    it('should reorder pockets successfully', async () => {
      // Arrange
      const pocketIds = ['pocket-1', 'pocket-2', 'pocket-3'];
      mockReorderPocketsUseCase.execute.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/api/pockets/reorder')
        .send({ pocketIds });

      // Assert
      expect(response.status).toBe(204);
      expect(mockReorderPocketsUseCase.execute).toHaveBeenCalledWith(
        { pocketIds },
        testUserId
      );
    });
  });
});
