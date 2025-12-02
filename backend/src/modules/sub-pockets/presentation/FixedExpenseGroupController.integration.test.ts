/**
 * Integration Tests for FixedExpenseGroupController
 * 
 * These tests verify the HTTP request/response flow through the controller,
 * including request validation, response formatting, and error handling.
 * 
 * Note: Use cases are mocked to avoid database dependencies.
 */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import type { CreateGroupDTO, UpdateGroupDTO } from '../application/dtos/FixedExpenseGroupDTO';
import { FixedExpenseGroupController } from './FixedExpenseGroupController';
import { CreateFixedExpenseGroupUseCase } from '../application/useCases/CreateFixedExpenseGroupUseCase';
import { GetAllGroupsUseCase } from '../application/useCases/GetAllGroupsUseCase';
import { UpdateGroupUseCase } from '../application/useCases/UpdateGroupUseCase';
import { DeleteGroupUseCase } from '../application/useCases/DeleteGroupUseCase';
import { ToggleGroupUseCase } from '../application/useCases/ToggleGroupUseCase';
import { ValidationError, NotFoundError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('FixedExpenseGroupController Integration Tests', () => {
  let app: express.Application;
  let mockCreateGroupUseCase: jest.Mocked<CreateFixedExpenseGroupUseCase>;
  let mockGetAllGroupsUseCase: jest.Mocked<GetAllGroupsUseCase>;
  let mockUpdateGroupUseCase: jest.Mocked<UpdateGroupUseCase>;
  let mockDeleteGroupUseCase: jest.Mocked<DeleteGroupUseCase>;
  let mockToggleGroupUseCase: jest.Mocked<ToggleGroupUseCase>;
  
  const testUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, _res: any, next: any) => {
    req.user = { id: testUserId };
    next();
  };

  beforeEach(() => {
    // Create mock use cases
    mockCreateGroupUseCase = { execute: jest.fn() } as any;
    mockGetAllGroupsUseCase = { execute: jest.fn() } as any;
    mockUpdateGroupUseCase = { execute: jest.fn() } as any;
    mockDeleteGroupUseCase = { execute: jest.fn() } as any;
    mockToggleGroupUseCase = { execute: jest.fn() } as any;

    // Create controller with mocked use cases
    const controller = new FixedExpenseGroupController(
      mockCreateGroupUseCase,
      mockGetAllGroupsUseCase,
      mockUpdateGroupUseCase,
      mockDeleteGroupUseCase,
      mockToggleGroupUseCase
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    const router = express.Router();
    router.post('/', (req, res, next) => controller.create(req, res, next));
    router.get('/', (req, res, next) => controller.getAll(req, res, next));
    router.put('/:id', (req, res, next) => controller.update(req, res, next));
    router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
    router.post('/:id/toggle', (req, res, next) => controller.toggle(req, res, next));
    
    app.use('/api/fixed-expense-groups', router);
    app.use(errorHandler);
  });

  describe('POST /api/fixed-expense-groups - Create Group', () => {
    it('should create a group successfully', async () => {
      const dto: CreateGroupDTO = {
        name: 'Monthly Bills',
        color: '#3b82f6'
      };

      const mockResponse = {
        id: 'group-123',
        name: 'Monthly Bills',
        color: '#3b82f6'
      };

      mockCreateGroupUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .post('/api/fixed-expense-groups')
        .send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
      expect(mockCreateGroupUseCase.execute).toHaveBeenCalledWith(dto, testUserId);
    });

    it('should return 400 for validation errors (empty name)', async () => {
      const dto: CreateGroupDTO = {
        name: '',
        color: '#3b82f6'
      };

      mockCreateGroupUseCase.execute.mockRejectedValue(
        new ValidationError('Group name is required')
      );

      const response = await request(app)
        .post('/api/fixed-expense-groups')
        .send(dto);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('name is required');
    });

    it('should return 400 for invalid color format', async () => {
      const dto: CreateGroupDTO = {
        name: 'Monthly Bills',
        color: 'invalid-color'
      };

      mockCreateGroupUseCase.execute.mockRejectedValue(
        new ValidationError('Invalid color format')
      );

      const response = await request(app)
        .post('/api/fixed-expense-groups')
        .send(dto);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('color');
    });
  });

  describe('GET /api/fixed-expense-groups - Get All Groups', () => {
    it('should return all groups for user', async () => {
      const mockGroups = [
        { id: 'group-1', name: 'Monthly Bills', color: '#3b82f6' },
        { id: 'group-2', name: 'Annual Expenses', color: '#ef4444' }
      ];

      mockGetAllGroupsUseCase.execute.mockResolvedValue(mockGroups as any);

      const response = await request(app)
        .get('/api/fixed-expense-groups');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(mockGetAllGroupsUseCase.execute).toHaveBeenCalledWith(testUserId);
    });

    it('should return empty array when user has no groups', async () => {
      mockGetAllGroupsUseCase.execute.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/fixed-expense-groups');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /api/fixed-expense-groups/:id - Update Group', () => {
    it('should update group successfully', async () => {
      const dto: UpdateGroupDTO = {
        name: 'Updated Monthly Bills',
        color: '#10b981'
      };

      const mockResponse = {
        id: 'group-123',
        name: 'Updated Monthly Bills',
        color: '#10b981'
      };

      mockUpdateGroupUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .put('/api/fixed-expense-groups/group-123')
        .send(dto);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockUpdateGroupUseCase.execute).toHaveBeenCalledWith('group-123', dto, testUserId);
    });

    it('should update only name', async () => {
      const dto: UpdateGroupDTO = {
        name: 'Updated Name'
      };

      const mockResponse = {
        id: 'group-123',
        name: 'Updated Name',
        color: '#3b82f6'
      };

      mockUpdateGroupUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .put('/api/fixed-expense-groups/group-123')
        .send(dto);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 404 when group not found', async () => {
      const dto: UpdateGroupDTO = { name: 'Updated' };

      mockUpdateGroupUseCase.execute.mockRejectedValue(
        new NotFoundError('Group not found')
      );

      const response = await request(app)
        .put('/api/fixed-expense-groups/nonexistent')
        .send(dto);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/fixed-expense-groups/:id - Delete Group', () => {
    it('should delete group successfully', async () => {
      mockDeleteGroupUseCase.execute.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/fixed-expense-groups/group-123');

      expect(response.status).toBe(204);
      expect(mockDeleteGroupUseCase.execute).toHaveBeenCalledWith('group-123', testUserId);
    });

    it('should return 404 when group not found', async () => {
      mockDeleteGroupUseCase.execute.mockRejectedValue(
        new NotFoundError('Group not found')
      );

      const response = await request(app)
        .delete('/api/fixed-expense-groups/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/fixed-expense-groups/:id/toggle - Toggle Group', () => {
    it('should toggle group and all sub-pockets', async () => {
      const mockResponse = {
        id: 'group-123',
        name: 'Monthly Bills',
        color: '#3b82f6'
      };

      mockToggleGroupUseCase.execute.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .post('/api/fixed-expense-groups/group-123/toggle');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockToggleGroupUseCase.execute).toHaveBeenCalledWith('group-123', testUserId);
    });

    it('should return 404 when group not found', async () => {
      mockToggleGroupUseCase.execute.mockRejectedValue(
        new NotFoundError('Group not found')
      );

      const response = await request(app)
        .post('/api/fixed-expense-groups/nonexistent/toggle');

      expect(response.status).toBe(404);
    });
  });
});
