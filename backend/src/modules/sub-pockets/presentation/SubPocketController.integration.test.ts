/**
 * Integration Tests for SubPocketController
 * 
 * These tests verify the HTTP request/response flow through the controller,
 * including request validation, response formatting, and error handling.
 * 
 * Note: Use cases are mocked to avoid database dependencies.
 */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import type { CreateSubPocketDTO, UpdateSubPocketDTO } from '../application/dtos/SubPocketDTO';
import { SubPocketController } from './SubPocketController';
import { CreateSubPocketUseCase } from '../application/useCases/CreateSubPocketUseCase';
import { GetSubPocketsByPocketUseCase } from '../application/useCases/GetSubPocketsByPocketUseCase';
import { GetSubPocketsByGroupUseCase } from '../application/useCases/GetSubPocketsByGroupUseCase';
import { UpdateSubPocketUseCase } from '../application/useCases/UpdateSubPocketUseCase';
import { DeleteSubPocketUseCase } from '../application/useCases/DeleteSubPocketUseCase';
import { ToggleSubPocketEnabledUseCase } from '../application/useCases/ToggleSubPocketEnabledUseCase';
import { MoveSubPocketToGroupUseCase } from '../application/useCases/MoveSubPocketToGroupUseCase';
import { ReorderSubPocketsUseCase } from '../application/useCases/ReorderSubPocketsUseCase';
import { ValidationError, ConflictError, NotFoundError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('SubPocketController Integration Tests', () => {
  let app: express.Application;
  let mockCreateSubPocketUseCase: jest.Mocked<CreateSubPocketUseCase>;
  let mockGetSubPocketsByPocketUseCase: jest.Mocked<GetSubPocketsByPocketUseCase>;
  let mockGetSubPocketsByGroupUseCase: jest.Mocked<GetSubPocketsByGroupUseCase>;
  let mockUpdateSubPocketUseCase: jest.Mocked<UpdateSubPocketUseCase>;
  let mockDeleteSubPocketUseCase: jest.Mocked<DeleteSubPocketUseCase>;
  let mockToggleSubPocketEnabledUseCase: jest.Mocked<ToggleSubPocketEnabledUseCase>;
  let mockMoveSubPocketToGroupUseCase: jest.Mocked<MoveSubPocketToGroupUseCase>;
  let mockReorderSubPocketsUseCase: jest.Mocked<ReorderSubPocketsUseCase>;
  
  const testUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, _res: any, next: any) => {
    req.user = { id: testUserId };
    next();
  };

  beforeEach(() => {
    // Create mock use cases
    mockCreateSubPocketUseCase = { execute: jest.fn() } as any;
    mockGetSubPocketsByPocketUseCase = { execute: jest.fn() } as any;
    mockGetSubPocketsByGroupUseCase = { execute: jest.fn() } as any;
    mockUpdateSubPocketUseCase = { execute: jest.fn() } as any;
    mockDeleteSubPocketUseCase = { execute: jest.fn() } as any;
    mockToggleSubPocketEnabledUseCase = { execute: jest.fn() } as any;
    mockMoveSubPocketToGroupUseCase = { execute: jest.fn() } as any;
    mockReorderSubPocketsUseCase = { execute: jest.fn() } as any;

    // Create controller with mocked use cases
    const controller = new SubPocketController(
      mockCreateSubPocketUseCase,
      mockGetSubPocketsByPocketUseCase,
      mockGetSubPocketsByGroupUseCase,
      mockUpdateSubPocketUseCase,
      mockDeleteSubPocketUseCase,
      mockToggleSubPocketEnabledUseCase,
      mockMoveSubPocketToGroupUseCase,
      mockReorderSubPocketsUseCase
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    const router = express.Router();
    router.post('/', (req, res, next) => controller.create(req, res, next));
    router.get('/', (req, res, next) => controller.getByFilter(req, res, next));
    router.put('/:id', (req, res, next) => controller.update(req, res, next));
    router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
    router.post('/:id/toggle', (req, res, next) => controller.toggle(req, res, next));
    router.post('/:id/move-to-group', (req, res, next) => controller.moveToGroup(req, res, next));
    router.post('/reorder', (req, res, next) => controller.reorder(req, res, next));
    
    app.use('/api/sub-pockets', router);
    app.use(errorHandler);
  });

  describe('POST /api/sub-pockets - Create SubPocket', () => {
    it('should create a sub-pocket successfully', async () => {
      const dto: CreateSubPocketDTO = {
        pocketId: 'pocket-123',
        name: 'Rent',
        valueTotal: 1200,
        periodicityMonths: 1
      };

      const mockResponse = {
        id: 'subpocket-123',
        pocketId: 'pocket-123',
        name: 'Rent',
        valueTotal: 1200,
        periodicityMonths: 1,
        balance: 0,
        enabled: true,
        monthlyContribution: 1200
      };

      mockCreateSubPocketUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .post('/api/sub-pockets')
        .send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
      expect(mockCreateSubPocketUseCase.execute).toHaveBeenCalledWith(dto, testUserId);
    });

    it('should return 400 for validation errors', async () => {
      const dto: CreateSubPocketDTO = {
        pocketId: 'pocket-123',
        name: '',
        valueTotal: 1200,
        periodicityMonths: 1
      };

      mockCreateSubPocketUseCase.execute.mockRejectedValue(
        new ValidationError('SubPocket name is required')
      );

      const response = await request(app)
        .post('/api/sub-pockets')
        .send(dto);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('name is required');
    });

    it('should return 409 when pocket is not fixed type', async () => {
      const dto: CreateSubPocketDTO = {
        pocketId: 'pocket-123',
        name: 'Rent',
        valueTotal: 1200,
        periodicityMonths: 1
      };

      mockCreateSubPocketUseCase.execute.mockRejectedValue(
        new ConflictError('SubPockets can only be created in fixed pockets')
      );

      const response = await request(app)
        .post('/api/sub-pockets')
        .send(dto);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('fixed pockets');
    });
  });

  describe('GET /api/sub-pockets - Get SubPockets', () => {
    it('should return sub-pockets by pocket ID', async () => {
      const mockSubPockets = [
        { id: '1', pocketId: 'pocket-123', name: 'Rent', valueTotal: 1200, periodicityMonths: 1, balance: 0, enabled: true, monthlyContribution: 1200 },
        { id: '2', pocketId: 'pocket-123', name: 'Utilities', valueTotal: 200, periodicityMonths: 1, balance: 0, enabled: true, monthlyContribution: 200 }
      ];

      mockGetSubPocketsByPocketUseCase.execute.mockResolvedValue(mockSubPockets as any);

      const response = await request(app)
        .get('/api/sub-pockets?pocketId=pocket-123');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(mockGetSubPocketsByPocketUseCase.execute).toHaveBeenCalledWith('pocket-123', testUserId);
    });

    it('should return sub-pockets by group ID', async () => {
      const mockSubPockets = [
        { id: '1', pocketId: 'pocket-123', name: 'Rent', groupId: 'group-123', valueTotal: 1200, periodicityMonths: 1, balance: 0, enabled: true, monthlyContribution: 1200 }
      ];

      mockGetSubPocketsByGroupUseCase.execute.mockResolvedValue(mockSubPockets as any);

      const response = await request(app)
        .get('/api/sub-pockets?groupId=group-123');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(mockGetSubPocketsByGroupUseCase.execute).toHaveBeenCalledWith('group-123', testUserId);
    });

    it('should return 400 when neither pocketId nor groupId provided', async () => {
      const response = await request(app)
        .get('/api/sub-pockets');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('pocketId or groupId is required');
    });
  });

  describe('PUT /api/sub-pockets/:id - Update SubPocket', () => {
    it('should update sub-pocket successfully', async () => {
      const dto: UpdateSubPocketDTO = {
        name: 'Updated Rent',
        valueTotal: 1300
      };

      const mockResponse = {
        id: 'subpocket-123',
        pocketId: 'pocket-123',
        name: 'Updated Rent',
        valueTotal: 1300,
        periodicityMonths: 1,
        balance: 0,
        enabled: true,
        monthlyContribution: 1300
      };

      mockUpdateSubPocketUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .put('/api/sub-pockets/subpocket-123')
        .send(dto);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockUpdateSubPocketUseCase.execute).toHaveBeenCalledWith('subpocket-123', dto, testUserId);
    });

    it('should return 404 when sub-pocket not found', async () => {
      const dto: UpdateSubPocketDTO = { name: 'Updated' };

      mockUpdateSubPocketUseCase.execute.mockRejectedValue(
        new NotFoundError('SubPocket not found')
      );

      const response = await request(app)
        .put('/api/sub-pockets/nonexistent')
        .send(dto);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/sub-pockets/:id - Delete SubPocket', () => {
    it('should delete sub-pocket successfully', async () => {
      mockDeleteSubPocketUseCase.execute.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/sub-pockets/subpocket-123');

      expect(response.status).toBe(204);
      expect(mockDeleteSubPocketUseCase.execute).toHaveBeenCalledWith('subpocket-123', testUserId);
    });

    it('should return 409 when sub-pocket has movements', async () => {
      mockDeleteSubPocketUseCase.execute.mockRejectedValue(
        new ConflictError('Cannot delete sub-pocket with movements')
      );

      const response = await request(app)
        .delete('/api/sub-pockets/subpocket-123');

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('movements');
    });
  });

  describe('POST /api/sub-pockets/:id/toggle - Toggle SubPocket', () => {
    it('should toggle sub-pocket enabled status', async () => {
      const mockResponse = {
        id: 'subpocket-123',
        pocketId: 'pocket-123',
        name: 'Rent',
        valueTotal: 1200,
        periodicityMonths: 1,
        balance: 0,
        enabled: false,
        monthlyContribution: 1200
      };

      mockToggleSubPocketEnabledUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .post('/api/sub-pockets/subpocket-123/toggle');

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
      expect(mockToggleSubPocketEnabledUseCase.execute).toHaveBeenCalledWith('subpocket-123', testUserId);
    });
  });

  describe('POST /api/sub-pockets/:id/move-to-group - Move SubPocket', () => {
    it('should move sub-pocket to group', async () => {
      const mockResponse = {
        id: 'subpocket-123',
        pocketId: 'pocket-123',
        name: 'Rent',
        valueTotal: 1200,
        periodicityMonths: 1,
        balance: 0,
        enabled: true,
        groupId: 'group-456',
        monthlyContribution: 1200
      };

      mockMoveSubPocketToGroupUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .post('/api/sub-pockets/subpocket-123/move-to-group')
        .send({ groupId: 'group-456' });

      expect(response.status).toBe(200);
      expect(response.body.groupId).toBe('group-456');
      expect(mockMoveSubPocketToGroupUseCase.execute).toHaveBeenCalledWith('subpocket-123', 'group-456', testUserId);
    });

    it('should move sub-pocket to default group (null)', async () => {
      const mockResponse = {
        id: 'subpocket-123',
        pocketId: 'pocket-123',
        name: 'Rent',
        valueTotal: 1200,
        periodicityMonths: 1,
        balance: 0,
        enabled: true,
        groupId: null,
        monthlyContribution: 1200
      };

      mockMoveSubPocketToGroupUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .post('/api/sub-pockets/subpocket-123/move-to-group')
        .send({ groupId: null });

      expect(response.status).toBe(200);
      expect(response.body.groupId).toBeNull();
    });
  });

  describe('POST /api/sub-pockets/reorder - Reorder SubPockets', () => {
    it('should reorder sub-pockets successfully', async () => {
      mockReorderSubPocketsUseCase.execute.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/sub-pockets/reorder')
        .send({ subPocketIds: ['sp1', 'sp2', 'sp3'] });

      expect(response.status).toBe(204);
      expect(mockReorderSubPocketsUseCase.execute).toHaveBeenCalledWith(['sp1', 'sp2', 'sp3'], testUserId);
    });
  });
});
