/**
 * Integration Tests for MovementController
 * 
 * These tests verify the HTTP request/response flow through the controller,
 * including request validation, response formatting, and error handling.
 * 
 * Note: Use cases are mocked to avoid database dependencies.
 * For database integration tests, see SupabaseMovementRepository.integration.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import type { CreateMovementDTO, UpdateMovementDTO } from '../application/dtos/MovementDTO';
import { MovementController } from './MovementController';
import { CreateMovementUseCase } from '../application/useCases/CreateMovementUseCase';
import { GetMovementsByAccountUseCase } from '../application/useCases/GetMovementsByAccountUseCase';
import { GetMovementsByPocketUseCase } from '../application/useCases/GetMovementsByPocketUseCase';
import { GetMovementsByMonthUseCase } from '../application/useCases/GetMovementsByMonthUseCase';
import { GetPendingMovementsUseCase } from '../application/useCases/GetPendingMovementsUseCase';
import { GetOrphanedMovementsUseCase } from '../application/useCases/GetOrphanedMovementsUseCase';
import { UpdateMovementUseCase } from '../application/useCases/UpdateMovementUseCase';
import { DeleteMovementUseCase } from '../application/useCases/DeleteMovementUseCase';
import { ApplyPendingMovementUseCase } from '../application/useCases/ApplyPendingMovementUseCase';
import { MarkAsPendingUseCase } from '../application/useCases/MarkAsPendingUseCase';
import { RestoreOrphanedMovementsUseCase } from '../application/useCases/RestoreOrphanedMovementsUseCase';
import { ValidationError, NotFoundError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('MovementController Integration Tests', () => {
  let app: express.Application;
  let mockCreateMovementUseCase: jest.Mocked<CreateMovementUseCase>;
  let mockGetMovementsByAccountUseCase: jest.Mocked<GetMovementsByAccountUseCase>;
  let mockGetMovementsByPocketUseCase: jest.Mocked<GetMovementsByPocketUseCase>;
  let mockGetMovementsByMonthUseCase: jest.Mocked<GetMovementsByMonthUseCase>;
  let mockGetPendingMovementsUseCase: jest.Mocked<GetPendingMovementsUseCase>;
  let mockGetOrphanedMovementsUseCase: jest.Mocked<GetOrphanedMovementsUseCase>;
  let mockUpdateMovementUseCase: jest.Mocked<UpdateMovementUseCase>;
  let mockDeleteMovementUseCase: jest.Mocked<DeleteMovementUseCase>;
  let mockApplyPendingMovementUseCase: jest.Mocked<ApplyPendingMovementUseCase>;
  let mockMarkAsPendingUseCase: jest.Mocked<MarkAsPendingUseCase>;
  let mockRestoreOrphanedMovementsUseCase: jest.Mocked<RestoreOrphanedMovementsUseCase>;
  
  const testUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, _res: any, next: any) => {
    req.user = { id: testUserId };
    next();
  };

  beforeEach(() => {
    // Create mock use cases
    mockCreateMovementUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetMovementsByAccountUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetMovementsByPocketUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetMovementsByMonthUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetPendingMovementsUseCase = {
      execute: jest.fn()
    } as any;
    
    mockGetOrphanedMovementsUseCase = {
      execute: jest.fn()
    } as any;
    
    mockUpdateMovementUseCase = {
      execute: jest.fn()
    } as any;
    
    mockDeleteMovementUseCase = {
      execute: jest.fn()
    } as any;
    
    mockApplyPendingMovementUseCase = {
      execute: jest.fn()
    } as any;
    
    mockMarkAsPendingUseCase = {
      execute: jest.fn()
    } as any;
    
    mockRestoreOrphanedMovementsUseCase = {
      execute: jest.fn()
    } as any;

    // Create controller with mocked use cases
    const controller = new MovementController(
      mockCreateMovementUseCase,
      mockGetMovementsByAccountUseCase,
      mockGetMovementsByPocketUseCase,
      mockGetMovementsByMonthUseCase,
      mockGetPendingMovementsUseCase,
      mockGetOrphanedMovementsUseCase,
      mockUpdateMovementUseCase,
      mockDeleteMovementUseCase,
      mockApplyPendingMovementUseCase,
      mockMarkAsPendingUseCase,
      mockRestoreOrphanedMovementsUseCase
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    const router = express.Router();
    router.post('/', (req, res, next) => controller.create(req, res, next));
    router.get('/', (req, res, next) => controller.getAll(req, res, next));
    router.get('/pending', (req, res, next) => controller.getPending(req, res, next));
    router.get('/orphaned', (req, res, next) => controller.getOrphaned(req, res, next));
    router.post('/restore-orphaned', (req, res, next) => controller.restoreOrphaned(req, res, next));
    router.put('/:id', (req, res, next) => controller.update(req, res, next));
    router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
    router.post('/:id/apply', (req, res, next) => controller.applyPending(req, res, next));
    router.post('/:id/mark-pending', (req, res, next) => controller.markAsPending(req, res, next));
    
    app.use('/api/movements', router);
    app.use(errorHandler);
  });

  describe('POST /api/movements - Create Movement', () => {
    it('should create a movement successfully', async () => {
      // Arrange
      const dto: CreateMovementDTO = {
        type: 'EgresoNormal',
        accountId: 'account-123',
        pocketId: 'pocket-123',
        amount: 100,
        displayedDate: '2024-01-15T10:00:00Z',
        notes: 'Groceries',
        isPending: false
      };

      const mockResponse = {
        id: 'movement-123',
        type: 'EgresoNormal',
        accountId: 'account-123',
        pocketId: 'pocket-123',
        amount: 100,
        displayedDate: '2024-01-15T10:00:00Z',
        notes: 'Groceries',
        isPending: false,
        isOrphaned: false
      };

      mockCreateMovementUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .post('/api/movements')
        .send(dto);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
      expect(mockCreateMovementUseCase.execute).toHaveBeenCalledWith(dto, testUserId);
    });

    it('should return 400 for validation error', async () => {
      // Arrange
      const dto: CreateMovementDTO = {
        type: 'EgresoNormal',
        accountId: 'account-123',
        pocketId: 'pocket-123',
        amount: -100, // Invalid: negative amount
        displayedDate: '2024-01-15T10:00:00Z'
      };

      mockCreateMovementUseCase.execute.mockRejectedValue(
        new ValidationError('Amount must be positive')
      );

      // Act
      const response = await request(app)
        .post('/api/movements')
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Amount must be positive');
    });

    it('should return 404 for invalid references', async () => {
      // Arrange
      const dto: CreateMovementDTO = {
        type: 'EgresoNormal',
        accountId: 'invalid-account',
        pocketId: 'pocket-123',
        amount: 100,
        displayedDate: '2024-01-15T10:00:00Z'
      };

      mockCreateMovementUseCase.execute.mockRejectedValue(
        new NotFoundError('Account with ID invalid-account not found')
      );

      // Act
      const response = await request(app)
        .post('/api/movements')
        .send(dto);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Account with ID invalid-account not found');
    });
  });

  describe('GET /api/movements - Get Movements with Filters', () => {
    it('should get movements by account', async () => {
      // Arrange
      const mockMovements = [
        {
          id: 'movement-1',
          type: 'EgresoNormal',
          accountId: 'account-123',
          pocketId: 'pocket-123',
          amount: 100,
          displayedDate: '2024-01-15T10:00:00Z',
          isPending: false,
          isOrphaned: false
        }
      ];

      mockGetMovementsByAccountUseCase.execute.mockResolvedValue(mockMovements as any);

      // Act
      const response = await request(app)
        .get('/api/movements')
        .query({ accountId: 'account-123' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMovements);
      expect(mockGetMovementsByAccountUseCase.execute).toHaveBeenCalledWith(
        'account-123',
        testUserId,
        { isPending: undefined, year: undefined, month: undefined }
      );
    });

    it('should get movements by pocket', async () => {
      // Arrange
      const mockMovements = [
        {
          id: 'movement-1',
          type: 'IngresoNormal',
          accountId: 'account-123',
          pocketId: 'pocket-456',
          amount: 500,
          displayedDate: '2024-01-15T10:00:00Z',
          isPending: false,
          isOrphaned: false
        }
      ];

      mockGetMovementsByPocketUseCase.execute.mockResolvedValue(mockMovements as any);

      // Act
      const response = await request(app)
        .get('/api/movements')
        .query({ pocketId: 'pocket-456' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMovements);
      expect(mockGetMovementsByPocketUseCase.execute).toHaveBeenCalledWith(
        'pocket-456',
        testUserId,
        { isPending: undefined, year: undefined, month: undefined }
      );
    });

    it('should get movements by month', async () => {
      // Arrange
      const mockResult = {
        year: 2024,
        month: 1,
        movements: [
          {
            id: 'movement-1',
            type: 'EgresoNormal',
            accountId: 'account-123',
            pocketId: 'pocket-123',
            amount: 100,
            displayedDate: '2024-01-15T10:00:00Z',
            isPending: false,
            isOrphaned: false
          }
        ]
      };

      mockGetMovementsByMonthUseCase.execute.mockResolvedValue(mockResult as any);

      // Act
      const response = await request(app)
        .get('/api/movements')
        .query({ year: '2024', month: '1' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockGetMovementsByMonthUseCase.execute).toHaveBeenCalledWith(
        2024,
        1,
        testUserId
      );
    });

    it('should return 400 when no filter is provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/movements');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('At least one filter parameter is required');
    });

    it('should filter by pending status', async () => {
      // Arrange
      const mockMovements = [
        {
          id: 'movement-1',
          type: 'EgresoNormal',
          accountId: 'account-123',
          pocketId: 'pocket-123',
          amount: 100,
          displayedDate: '2024-01-15T10:00:00Z',
          isPending: true,
          isOrphaned: false
        }
      ];

      mockGetMovementsByAccountUseCase.execute.mockResolvedValue(mockMovements as any);

      // Act
      const response = await request(app)
        .get('/api/movements')
        .query({ accountId: 'account-123', pending: 'true' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMovements);
      expect(mockGetMovementsByAccountUseCase.execute).toHaveBeenCalledWith(
        'account-123',
        testUserId,
        { isPending: true, year: undefined, month: undefined }
      );
    });
  });

  describe('GET /api/movements/pending - Get Pending Movements', () => {
    it('should get all pending movements', async () => {
      // Arrange
      const mockMovements = [
        {
          id: 'movement-1',
          type: 'EgresoNormal',
          accountId: 'account-123',
          pocketId: 'pocket-123',
          amount: 100,
          displayedDate: '2024-01-15T10:00:00Z',
          isPending: true,
          isOrphaned: false
        }
      ];

      mockGetPendingMovementsUseCase.execute.mockResolvedValue(mockMovements as any);

      // Act
      const response = await request(app)
        .get('/api/movements/pending');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMovements);
      expect(mockGetPendingMovementsUseCase.execute).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('GET /api/movements/orphaned - Get Orphaned Movements', () => {
    it('should get all orphaned movements', async () => {
      // Arrange
      const mockMovements = [
        {
          id: 'movement-1',
          type: 'EgresoNormal',
          accountId: 'account-123',
          pocketId: 'pocket-123',
          amount: 100,
          displayedDate: '2024-01-15T10:00:00Z',
          isPending: false,
          isOrphaned: true,
          orphanedAccountName: 'Old Account',
          orphanedAccountCurrency: 'USD',
          orphanedPocketName: 'Old Pocket'
        }
      ];

      mockGetOrphanedMovementsUseCase.execute.mockResolvedValue(mockMovements as any);

      // Act
      const response = await request(app)
        .get('/api/movements/orphaned');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMovements);
      expect(mockGetOrphanedMovementsUseCase.execute).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('PUT /api/movements/:id - Update Movement', () => {
    it('should update a movement successfully', async () => {
      // Arrange
      const dto: UpdateMovementDTO = {
        amount: 150,
        notes: 'Updated notes'
      };

      const mockResponse = {
        id: 'movement-123',
        type: 'EgresoNormal',
        accountId: 'account-123',
        pocketId: 'pocket-123',
        amount: 150,
        displayedDate: '2024-01-15T10:00:00Z',
        notes: 'Updated notes',
        isPending: false,
        isOrphaned: false
      };

      mockUpdateMovementUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .put('/api/movements/movement-123')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockUpdateMovementUseCase.execute).toHaveBeenCalledWith(
        'movement-123',
        dto,
        testUserId
      );
    });

    it('should return 404 for non-existent movement', async () => {
      // Arrange
      const dto: UpdateMovementDTO = {
        amount: 150
      };

      mockUpdateMovementUseCase.execute.mockRejectedValue(
        new NotFoundError('Movement not found')
      );

      // Act
      const response = await request(app)
        .put('/api/movements/invalid-id')
        .send(dto);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Movement not found');
    });
  });

  describe('DELETE /api/movements/:id - Delete Movement', () => {
    it('should delete a movement successfully', async () => {
      // Arrange
      mockDeleteMovementUseCase.execute.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .delete('/api/movements/movement-123');

      // Assert
      expect(response.status).toBe(204);
      expect(mockDeleteMovementUseCase.execute).toHaveBeenCalledWith(
        'movement-123',
        testUserId
      );
    });

    it('should return 404 for non-existent movement', async () => {
      // Arrange
      mockDeleteMovementUseCase.execute.mockRejectedValue(
        new NotFoundError('Movement not found')
      );

      // Act
      const response = await request(app)
        .delete('/api/movements/invalid-id');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Movement not found');
    });
  });

  describe('POST /api/movements/:id/apply - Apply Pending Movement', () => {
    it('should apply a pending movement successfully', async () => {
      // Arrange
      const mockResponse = {
        id: 'movement-123',
        type: 'EgresoNormal',
        accountId: 'account-123',
        pocketId: 'pocket-123',
        amount: 100,
        displayedDate: '2024-01-15T10:00:00Z',
        isPending: false,
        isOrphaned: false
      };

      mockApplyPendingMovementUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .post('/api/movements/movement-123/apply');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockApplyPendingMovementUseCase.execute).toHaveBeenCalledWith(
        'movement-123',
        testUserId
      );
    });
  });

  describe('POST /api/movements/:id/mark-pending - Mark Movement as Pending', () => {
    it('should mark a movement as pending successfully', async () => {
      // Arrange
      const mockResponse = {
        id: 'movement-123',
        type: 'EgresoNormal',
        accountId: 'account-123',
        pocketId: 'pocket-123',
        amount: 100,
        displayedDate: '2024-01-15T10:00:00Z',
        isPending: true,
        isOrphaned: false
      };

      mockMarkAsPendingUseCase.execute.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .post('/api/movements/movement-123/mark-pending');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockMarkAsPendingUseCase.execute).toHaveBeenCalledWith(
        'movement-123',
        testUserId
      );
    });
  });

  describe('POST /api/movements/restore-orphaned - Restore Orphaned Movements', () => {
    it('should restore orphaned movements successfully', async () => {
      // Arrange
      const mockResult = {
        restored: 5,
        failed: 2
      };

      mockRestoreOrphanedMovementsUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/api/movements/restore-orphaned');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockRestoreOrphanedMovementsUseCase.execute).toHaveBeenCalledWith(testUserId);
    });

    it('should handle case with no orphaned movements', async () => {
      // Arrange
      const mockResult = {
        restored: 0,
        failed: 0
      };

      mockRestoreOrphanedMovementsUseCase.execute.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/api/movements/restore-orphaned');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });
});
