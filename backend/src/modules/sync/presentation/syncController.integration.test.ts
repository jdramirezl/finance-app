import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../../shared/middleware/errorHandler';

const mockExecute = jest.fn();
jest.mock('../application/syncToSheetsUseCase', () => ({
  SyncToSheetsUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

import { SyncController } from './syncController';

describe('SyncController Integration Tests', () => {
  let app: express.Application;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    mockExecute.mockReset();

    const mockSupabase = {} as any;
    const controller = new SyncController(mockSupabase);

    app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.user = { id: testUserId }; next(); });

    const router = express.Router();
    router.post('/', (req, res, next) => controller.syncToSheets(req, res, next));
    app.use('/api/sync', router);
    app.use(errorHandler);
  });

  describe('POST /api/sync', () => {
    it('should sync and return spreadsheet URL', async () => {
      mockExecute.mockResolvedValue({
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/abc123',
      });

      const res = await request(app).post('/api/sync');

      expect(res.status).toBe(200);
      expect(res.body.spreadsheetUrl).toBe('https://docs.google.com/spreadsheets/d/abc123');
      expect(res.body.syncedAt).toBeDefined();
      expect(mockExecute).toHaveBeenCalledWith(testUserId, expect.anything());
    });

    it('should return 401 when user is not authenticated', async () => {
      const noAuthApp = express();
      noAuthApp.use(express.json());
      const controller = new SyncController({} as any);
      const router = express.Router();
      router.post('/', (req, res, next) => controller.syncToSheets(req, res, next));
      noAuthApp.use('/api/sync', router);
      noAuthApp.use(errorHandler);

      const res = await request(noAuthApp).post('/api/sync');

      expect(res.status).toBe(401);
    });

    it('should pass errors to error handler', async () => {
      mockExecute.mockRejectedValue(new Error('Google API failed'));

      const res = await request(app).post('/api/sync');

      expect(res.status).toBe(500);
    });
  });
});
