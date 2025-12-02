/**
 * Integration Tests for SettingsController
 * 
 * These tests verify the HTTP request/response flow through the controller,
 * including request validation, response formatting, and error handling.
 * 
 * Note: Use cases are mocked to avoid database dependencies.
 */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import type { UpdateSettingsDTO } from '../application/dtos/SettingsDTO';
import { SettingsController } from './SettingsController';
import { GetSettingsUseCase } from '../application/useCases/GetSettingsUseCase';
import { UpdateSettingsUseCase } from '../application/useCases/UpdateSettingsUseCase';
import { ValidationError, NotFoundError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('SettingsController Integration Tests', () => {
  let app: express.Application;
  let mockGetSettingsUseCase: jest.Mocked<GetSettingsUseCase>;
  let mockUpdateSettingsUseCase: jest.Mocked<UpdateSettingsUseCase>;
  
  const testUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: testUserId };
    next();
  };

  beforeEach(() => {
    // Create mock use cases
    mockGetSettingsUseCase = {
      execute: jest.fn()
    } as any;
    
    mockUpdateSettingsUseCase = {
      execute: jest.fn()
    } as any;

    // Create controller with mocked use cases
    const controller = new SettingsController(
      mockGetSettingsUseCase,
      mockUpdateSettingsUseCase
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    const router = express.Router();
    router.get('/', (req, res, next) => controller.get(req, res, next));
    router.put('/', (req, res, next) => controller.update(req, res, next));
    
    app.use('/api/settings', router);
    app.use(errorHandler);
  });

  describe('GET /api/settings - Get Settings', () => {
    it('should get user settings successfully', async () => {
      // Arrange
      const mockResponse = {
        id: 'settings-123',
        userId: testUserId,
        primaryCurrency: 'USD' as const,
        alphaVantageApiKey: 'test-api-key'
      };

      mockGetSettingsUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .get('/api/settings');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockGetSettingsUseCase.execute).toHaveBeenCalledWith(testUserId);
    });

    it('should return 404 if settings not found', async () => {
      // Arrange
      mockGetSettingsUseCase.execute.mockRejectedValue(
        new NotFoundError('Settings not found for user')
      );

      // Act
      const response = await request(app)
        .get('/api/settings');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 401 without authentication', async () => {
      // Arrange - Create app without auth middleware
      const appNoAuth = express();
      appNoAuth.use(express.json());
      
      const controller = new SettingsController(
        mockGetSettingsUseCase,
        mockUpdateSettingsUseCase
      );
      
      const router = express.Router();
      router.get('/', (req, res, next) => controller.get(req, res, next));
      appNoAuth.use('/api/settings', router);
      appNoAuth.use(errorHandler);

      // Act
      const response = await request(appNoAuth)
        .get('/api/settings');

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/settings - Update Settings', () => {
    it('should update primary currency successfully', async () => {
      // Arrange
      const dto: UpdateSettingsDTO = {
        primaryCurrency: 'EUR'
      };

      const mockResponse = {
        id: 'settings-123',
        userId: testUserId,
        primaryCurrency: 'EUR' as const,
        alphaVantageApiKey: 'test-api-key'
      };

      mockUpdateSettingsUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .put('/api/settings')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockUpdateSettingsUseCase.execute).toHaveBeenCalledWith(testUserId, dto);
    });

    it('should update Alpha Vantage API key successfully', async () => {
      // Arrange
      const dto: UpdateSettingsDTO = {
        alphaVantageApiKey: 'new-api-key'
      };

      const mockResponse = {
        id: 'settings-123',
        userId: testUserId,
        primaryCurrency: 'USD' as const,
        alphaVantageApiKey: 'new-api-key'
      };

      mockUpdateSettingsUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .put('/api/settings')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should update both currency and API key', async () => {
      // Arrange
      const dto: UpdateSettingsDTO = {
        primaryCurrency: 'GBP',
        alphaVantageApiKey: 'new-api-key'
      };

      const mockResponse = {
        id: 'settings-123',
        userId: testUserId,
        primaryCurrency: 'GBP' as const,
        alphaVantageApiKey: 'new-api-key'
      };

      mockUpdateSettingsUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .put('/api/settings')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should return 400 for invalid currency', async () => {
      // Arrange
      const dto: UpdateSettingsDTO = {
        primaryCurrency: 'INVALID' as any
      };

      mockUpdateSettingsUseCase.execute.mockRejectedValue(
        new ValidationError('Invalid primary currency - must be one of: USD, MXN, COP, EUR, GBP')
      );

      // Act
      const response = await request(app)
        .put('/api/settings')
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 404 if settings not found', async () => {
      // Arrange
      const dto: UpdateSettingsDTO = {
        primaryCurrency: 'EUR'
      };

      mockUpdateSettingsUseCase.execute.mockRejectedValue(
        new NotFoundError('Settings not found for user')
      );

      // Act
      const response = await request(app)
        .put('/api/settings')
        .send(dto);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });
  });
});
