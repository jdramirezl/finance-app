import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler';
import { NotFoundError, PriceUnavailableError } from '../errors/AppError';

function appThrowing(err: unknown) {
  const app = express();
  app.get('/x', (_req, _res, next) => next(err));
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('returns PRICE_UNAVAILABLE as 503 with code, retryable and Retry-After (not a raw 500)', async () => {
    const res = await request(appThrowing(new PriceUnavailableError('VOO', 'rate limited', true, 60))).get('/x');

    expect(res.status).toBe(503);
    expect(res.headers['retry-after']).toBe('60');
    expect(res.body).toEqual({
      status: 'error',
      code: 'PRICE_UNAVAILABLE',
      retryable: true,
      message: expect.stringContaining('VOO'),
    });
  });

  it('omits Retry-After when the error is not retryable', async () => {
    const res = await request(appThrowing(new PriceUnavailableError('VOO', 'key rejected', false))).get('/x');
    expect(res.status).toBe(503);
    expect(res.headers['retry-after']).toBeUndefined();
    expect(res.body.retryable).toBe(false);
  });

  it('keeps the existing shape for other operational errors', async () => {
    const res = await request(appThrowing(new NotFoundError('nope'))).get('/x');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ status: 'error', message: 'nope' });
  });
});
