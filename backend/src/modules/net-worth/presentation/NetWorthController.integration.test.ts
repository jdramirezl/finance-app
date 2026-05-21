import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { NetWorthController } from './NetWorthController';
import { GetAllSnapshotsUseCase } from '../application/useCases/GetAllSnapshotsUseCase';
import { GetLatestSnapshotUseCase } from '../application/useCases/GetLatestSnapshotUseCase';
import { CreateSnapshotUseCase } from '../application/useCases/CreateSnapshotUseCase';
import { UpdateSnapshotUseCase } from '../application/useCases/UpdateSnapshotUseCase';
import { DeleteSnapshotUseCase } from '../application/useCases/DeleteSnapshotUseCase';
import { NotFoundError } from '../../../shared/errors/AppError';
import { errorHandler } from '../../../shared/middleware/errorHandler';

describe('NetWorthController Integration Tests', () => {
  let app: express.Application;
  let mockGetAll: jest.Mocked<GetAllSnapshotsUseCase>;
  let mockGetLatest: jest.Mocked<GetLatestSnapshotUseCase>;
  let mockCreate: jest.Mocked<CreateSnapshotUseCase>;
  let mockUpdate: jest.Mocked<UpdateSnapshotUseCase>;
  let mockDelete: jest.Mocked<DeleteSnapshotUseCase>;

  const testUserId = 'test-user-123';

  beforeEach(() => {
    mockGetAll = { execute: jest.fn() } as any;
    mockGetLatest = { execute: jest.fn() } as any;
    mockCreate = { execute: jest.fn() } as any;
    mockUpdate = { execute: jest.fn() } as any;
    mockDelete = { execute: jest.fn() } as any;

    const controller = new NetWorthController(
      mockGetAll, mockGetLatest, mockCreate, mockUpdate, mockDelete
    );

    app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.user = { id: testUserId }; next(); });

    const router = express.Router();
    router.get('/', (req, res, next) => controller.getAll(req, res, next));
    router.get('/latest', (req, res, next) => controller.getLatest(req, res, next));
    router.post('/', (req, res, next) => controller.create(req, res, next));
    router.put('/:id', (req, res, next) => controller.update(req, res, next));
    router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
    app.use('/api/net-worth', router);
    app.use(errorHandler);
  });

  describe('GET /api/net-worth', () => {
    it('should return all snapshots', async () => {
      const snapshots = [
        { id: 's1', userId: testUserId, snapshotDate: '2026-01-01', totalNetWorth: 1000, baseCurrency: 'USD', breakdown: {}, createdAt: '' },
      ];
      mockGetAll.execute.mockResolvedValue(snapshots);

      const res = await request(app).get('/api/net-worth');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(snapshots);
      expect(mockGetAll.execute).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('GET /api/net-worth/latest', () => {
    it('should return latest snapshot', async () => {
      const snapshot = { id: 's1', userId: testUserId, snapshotDate: '2026-05-01', totalNetWorth: 5000, baseCurrency: 'USD', breakdown: {}, createdAt: '' };
      mockGetLatest.execute.mockResolvedValue(snapshot);

      const res = await request(app).get('/api/net-worth/latest');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(snapshot);
    });

    it('should return null when no snapshots exist', async () => {
      mockGetLatest.execute.mockResolvedValue(null);

      const res = await request(app).get('/api/net-worth/latest');

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe('POST /api/net-worth', () => {
    it('should create snapshot and return 201', async () => {
      const dto = { totalNetWorth: 2000, baseCurrency: 'USD', breakdown: { USD: 2000 } };
      const created = { id: 's2', userId: testUserId, snapshotDate: '2026-05-21', ...dto, createdAt: '' };
      mockCreate.execute.mockResolvedValue(created);

      const res = await request(app).post('/api/net-worth').send(dto);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(created);
      expect(mockCreate.execute).toHaveBeenCalledWith(testUserId, dto);
    });
  });

  describe('PUT /api/net-worth/:id', () => {
    it('should update snapshot', async () => {
      const updated = { id: 's1', userId: testUserId, snapshotDate: '2026-01-01', totalNetWorth: 3000, baseCurrency: 'USD', breakdown: { USD: 3000 }, createdAt: '' };
      mockUpdate.execute.mockResolvedValue(updated);

      const res = await request(app).put('/api/net-worth/s1').send({ totalNetWorth: 3000 });

      expect(res.status).toBe(200);
      expect(mockUpdate.execute).toHaveBeenCalledWith('s1', { totalNetWorth: 3000 }, testUserId);
    });

    it('should return 404 for non-existent snapshot', async () => {
      mockUpdate.execute.mockRejectedValue(new NotFoundError('Snapshot not found'));

      const res = await request(app).put('/api/net-worth/bad-id').send({ totalNetWorth: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/net-worth/:id', () => {
    it('should delete snapshot and return 204', async () => {
      mockDelete.execute.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/net-worth/s1');

      expect(res.status).toBe(204);
      expect(mockDelete.execute).toHaveBeenCalledWith('s1', testUserId);
    });

    it('should return 404 for ownership mismatch', async () => {
      mockDelete.execute.mockRejectedValue(new NotFoundError('Snapshot not found'));

      const res = await request(app).delete('/api/net-worth/other-snap');

      expect(res.status).toBe(404);
    });
  });
});
