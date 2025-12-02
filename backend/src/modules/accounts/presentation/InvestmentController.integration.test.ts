/**
 * Integration Tests for InvestmentController
 * 
 * These tests verify the HTTP request/response flow through the controller,
 * including request validation, response formatting, and error handling.
 * 
 * Note: Use cases are mocked to avoid database dependencies.
 */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { InvestmentController } from './InvestmentController';
import { GetCurrentStockPriceUseCase } from '../application/useCases/GetCurrentStockPriceUseCase';
import { UpdateInvestmentAccountUseCase } from '../application/useCases/UpdateInvestmentAccountUseCase';
import { StockPrice } from '../domain/StockPrice';
import { NotFoundError, ForbiddenError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('InvestmentController Integration Tests', () => {
  let app: express.Application;
  let mockGetCurrentStockPriceUseCase: jest.Mocked<GetCurrentStockPriceUseCase>;
  let mockUpdateInvestmentAccountUseCase: jest.Mocked<UpdateInvestmentAccountUseCase>;
  
  const testUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: testUserId };
    next();
  };

  beforeEach(() => {
    // Create mock use cases
    mockGetCurrentStockPriceUseCase = {
      execute: jest.fn(),
      clearLocalCache: jest.fn(),
      getCacheStats: jest.fn()
    } as any;
    
    mockUpdateInvestmentAccountUseCase = {
      execute: jest.fn()
    } as any;

    // Create controller with mocked use cases
    const controller = new InvestmentController(
      mockGetCurrentStockPriceUseCase,
      mockUpdateInvestmentAccountUseCase
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    const router = express.Router();
    router.get('/prices/:symbol', (req, res, next) => controller.getPriceBySymbol(req, res, next));
    router.get('/:accountId/price', (req, res, next) => controller.getPrice(req, res, next));
    router.post('/:accountId/update', (req, res, next) => controller.updateInvestment(req, res, next));
    
    app.use('/api/investments', router);
    app.use(errorHandler);
  });

  describe('GET /api/investments/prices/:symbol', () => {
    it('should get stock price by symbol successfully', async () => {
      const mockStockPrice = new StockPrice('VOO', 450.25, new Date('2024-01-15T10:00:00Z'));
      mockGetCurrentStockPriceUseCase.execute.mockResolvedValue(mockStockPrice);

      const response = await request(app)
        .get('/api/investments/prices/VOO');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        symbol: 'VOO',
        price: 450.25,
        cachedAt: '2024-01-15T10:00:00.000Z'
      });
      expect(mockGetCurrentStockPriceUseCase.execute).toHaveBeenCalledWith('VOO');
    });

    it('should handle errors when fetching stock price', async () => {
      mockGetCurrentStockPriceUseCase.execute.mockRejectedValue(
        new Error('Failed to fetch stock price')
      );

      const response = await request(app)
        .get('/api/investments/prices/INVALID');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 401 without authentication', async () => {
      // Create app without auth middleware
      const appNoAuth = express();
      appNoAuth.use(express.json());
      
      const controller = new InvestmentController(
        mockGetCurrentStockPriceUseCase,
        mockUpdateInvestmentAccountUseCase
      );
      
      const router = express.Router();
      router.get('/prices/:symbol', (req, res, next) => controller.getPriceBySymbol(req, res, next));
      appNoAuth.use('/api/investments', router);
      appNoAuth.use(errorHandler);

      const response = await request(appNoAuth)
        .get('/api/investments/prices/VOO');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/investments/:accountId/price', () => {
    it('should get stock price for account successfully', async () => {
      const mockStockPrice = new StockPrice('AAPL', 175.50, new Date('2024-01-15T10:00:00Z'));
      mockGetCurrentStockPriceUseCase.execute.mockResolvedValue(mockStockPrice);

      const response = await request(app)
        .get('/api/investments/account-123/price?symbol=AAPL');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        symbol: 'AAPL',
        price: 175.50,
        cachedAt: '2024-01-15T10:00:00.000Z'
      });
      expect(mockGetCurrentStockPriceUseCase.execute).toHaveBeenCalledWith('AAPL');
    });

    it('should return 400 when symbol is missing', async () => {
      const response = await request(app)
        .get('/api/investments/account-123/price');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Stock symbol is required'
      });
    });
  });

  describe('POST /api/investments/:accountId/update', () => {
    it('should update investment account successfully', async () => {
      mockUpdateInvestmentAccountUseCase.execute.mockResolvedValue();

      const response = await request(app)
        .post('/api/investments/account-123/update')
        .send({
          shares: 100,
          montoInvertido: 45000
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Investment account updated successfully'
      });
      expect(mockUpdateInvestmentAccountUseCase.execute).toHaveBeenCalledWith(
        'account-123',
        { shares: 100, montoInvertido: 45000 },
        testUserId
      );
    });

    it('should update only shares', async () => {
      mockUpdateInvestmentAccountUseCase.execute.mockResolvedValue();

      const response = await request(app)
        .post('/api/investments/account-123/update')
        .send({
          shares: 150
        });

      expect(response.status).toBe(200);
      expect(mockUpdateInvestmentAccountUseCase.execute).toHaveBeenCalledWith(
        'account-123',
        { shares: 150 },
        testUserId
      );
    });

    it('should update only montoInvertido', async () => {
      mockUpdateInvestmentAccountUseCase.execute.mockResolvedValue();

      const response = await request(app)
        .post('/api/investments/account-123/update')
        .send({
          montoInvertido: 50000
        });

      expect(response.status).toBe(200);
      expect(mockUpdateInvestmentAccountUseCase.execute).toHaveBeenCalledWith(
        'account-123',
        { montoInvertido: 50000 },
        testUserId
      );
    });

    it('should return 404 when account not found', async () => {
      mockUpdateInvestmentAccountUseCase.execute.mockRejectedValue(
        new NotFoundError('Account not found')
      );

      const response = await request(app)
        .post('/api/investments/account-123/update')
        .send({
          shares: 100
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Account not found');
    });

    it('should return 403 when account is not investment type', async () => {
      mockUpdateInvestmentAccountUseCase.execute.mockRejectedValue(
        new ForbiddenError('Can only update investment details on investment accounts')
      );

      const response = await request(app)
        .post('/api/investments/account-123/update')
        .send({
          shares: 100
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Can only update investment details on investment accounts');
    });

    it('should return 401 without authentication', async () => {
      // Create app without auth middleware
      const appNoAuth = express();
      appNoAuth.use(express.json());
      
      const controller = new InvestmentController(
        mockGetCurrentStockPriceUseCase,
        mockUpdateInvestmentAccountUseCase
      );
      
      const router = express.Router();
      router.post('/:accountId/update', (req, res, next) => controller.updateInvestment(req, res, next));
      appNoAuth.use('/api/investments', router);
      appNoAuth.use(errorHandler);

      const response = await request(appNoAuth)
        .post('/api/investments/account-123/update')
        .send({ shares: 100 });

      expect(response.status).toBe(401);
    });
  });
});
