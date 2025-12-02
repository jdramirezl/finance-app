/**
 * Integration Tests for CurrencyController
 * 
 * These tests verify the HTTP request/response flow through the controller,
 * including request validation, response formatting, and error handling.
 * 
 * Note: Use cases are mocked to avoid database dependencies.
 */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import type { ConvertCurrencyDTO } from '../application/dtos/ExchangeRateDTO';
import { CurrencyController } from './CurrencyController';
import { GetExchangeRateUseCase } from '../application/useCases/GetExchangeRateUseCase';
import { ConvertCurrencyUseCase } from '../application/useCases/ConvertCurrencyUseCase';
import { ValidationError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('CurrencyController Integration Tests', () => {
  let app: express.Application;
  let mockGetExchangeRateUseCase: jest.Mocked<GetExchangeRateUseCase>;
  let mockConvertCurrencyUseCase: jest.Mocked<ConvertCurrencyUseCase>;
  
  const testUserId = 'test-user-123';
  const mockAuthMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: testUserId };
    next();
  };

  beforeEach(() => {
    // Create mock use cases
    mockGetExchangeRateUseCase = {
      execute: jest.fn()
    } as any;
    
    mockConvertCurrencyUseCase = {
      execute: jest.fn()
    } as any;

    // Create controller with mocked use cases
    const controller = new CurrencyController(
      mockGetExchangeRateUseCase,
      mockConvertCurrencyUseCase
    );

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    const router = express.Router();
    router.get('/rates', (req, res, next) => controller.getRate(req, res, next));
    router.post('/convert', (req, res, next) => controller.convert(req, res, next));
    
    app.use('/api/currency', router);
    app.use(errorHandler);
  });

  describe('GET /api/currency/rates - Get Exchange Rate', () => {
    it('should get exchange rate successfully', async () => {
      // Arrange
      const mockResponse = {
        fromCurrency: 'USD' as const,
        toCurrency: 'MXN' as const,
        rate: 17.5,
        cachedAt: '2024-01-15T10:00:00.000Z'
      };

      mockGetExchangeRateUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .get('/api/currency/rates')
        .query({ from: 'USD', to: 'MXN' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockGetExchangeRateUseCase.execute).toHaveBeenCalledWith('USD', 'MXN');
    });

    it('should get rate for EUR to GBP', async () => {
      // Arrange
      const mockResponse = {
        fromCurrency: 'EUR' as const,
        toCurrency: 'GBP' as const,
        rate: 0.85,
        cachedAt: '2024-01-15T10:00:00.000Z'
      };

      mockGetExchangeRateUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .get('/api/currency/rates')
        .query({ from: 'EUR', to: 'GBP' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should return 400 if "from" parameter is missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/currency/rates')
        .query({ to: 'MXN' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if "to" parameter is missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/currency/rates')
        .query({ from: 'USD' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if both parameters are missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/currency/rates');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 401 without authentication', async () => {
      // Arrange - Create app without auth middleware
      const appNoAuth = express();
      appNoAuth.use(express.json());
      
      const controller = new CurrencyController(
        mockGetExchangeRateUseCase,
        mockConvertCurrencyUseCase
      );
      
      const router = express.Router();
      router.get('/rates', (req, res, next) => controller.getRate(req, res, next));
      appNoAuth.use('/api/currency', router);
      appNoAuth.use(errorHandler);

      // Act
      const response = await request(appNoAuth)
        .get('/api/currency/rates')
        .query({ from: 'USD', to: 'MXN' });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/currency/convert - Convert Currency', () => {
    it('should convert currency successfully', async () => {
      // Arrange
      const dto: ConvertCurrencyDTO = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'MXN'
      };

      const mockResponse = {
        amount: 100,
        fromCurrency: 'USD' as const,
        toCurrency: 'MXN' as const,
        convertedAmount: 1750,
        rate: 17.5
      };

      mockConvertCurrencyUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/api/currency/convert')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(mockConvertCurrencyUseCase.execute).toHaveBeenCalledWith(dto);
    });

    it('should convert between major currencies', async () => {
      // Arrange
      const dto: ConvertCurrencyDTO = {
        amount: 500,
        fromCurrency: 'EUR',
        toCurrency: 'GBP'
      };

      const mockResponse = {
        amount: 500,
        fromCurrency: 'EUR' as const,
        toCurrency: 'GBP' as const,
        convertedAmount: 425,
        rate: 0.85
      };

      mockConvertCurrencyUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/api/currency/convert')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should convert non-major currencies via USD', async () => {
      // Arrange
      const dto: ConvertCurrencyDTO = {
        amount: 1000,
        fromCurrency: 'MXN',
        toCurrency: 'COP'
      };

      const mockResponse = {
        amount: 1000,
        fromCurrency: 'MXN' as const,
        toCurrency: 'COP' as const,
        convertedAmount: 230000,
        rate: 230
      };

      mockConvertCurrencyUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/api/currency/convert')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should return 400 if amount is missing', async () => {
      // Arrange
      const dto = {
        fromCurrency: 'USD',
        toCurrency: 'MXN'
      };

      // Act
      const response = await request(app)
        .post('/api/currency/convert')
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if fromCurrency is missing', async () => {
      // Arrange
      const dto = {
        amount: 100,
        toCurrency: 'MXN'
      };

      // Act
      const response = await request(app)
        .post('/api/currency/convert')
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if toCurrency is missing', async () => {
      // Arrange
      const dto = {
        amount: 100,
        fromCurrency: 'USD'
      };

      // Act
      const response = await request(app)
        .post('/api/currency/convert')
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should return 400 for invalid amount', async () => {
      // Arrange
      const dto: ConvertCurrencyDTO = {
        amount: -100,
        fromCurrency: 'USD',
        toCurrency: 'MXN'
      };

      mockConvertCurrencyUseCase.execute.mockRejectedValue(
        new ValidationError('Amount cannot be negative')
      );

      // Act
      const response = await request(app)
        .post('/api/currency/convert')
        .send(dto);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('error');
    });

    it('should handle same currency conversion', async () => {
      // Arrange
      const dto: ConvertCurrencyDTO = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'USD'
      };

      const mockResponse = {
        amount: 100,
        fromCurrency: 'USD' as const,
        toCurrency: 'USD' as const,
        convertedAmount: 100,
        rate: 1.0
      };

      mockConvertCurrencyUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/api/currency/convert')
        .send(dto);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(response.body.convertedAmount).toBe(100);
      expect(response.body.rate).toBe(1.0);
    });
  });
});
