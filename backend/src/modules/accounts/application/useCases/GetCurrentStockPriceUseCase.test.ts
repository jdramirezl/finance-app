/**
 * Regression tests for provider failures (prod 2026-10-23: Alpha Vantage
 * rate-limited VOO/AMZN and the API answered a raw 500).
 */
import 'reflect-metadata';
import { GetCurrentStockPriceUseCase } from './GetCurrentStockPriceUseCase';
import { StockPrice } from '../../domain/StockPrice';
import { StockPriceProviderError } from '../../infrastructure/StockPriceProviderError';
import { DatabaseError, NotFoundError, PriceUnavailableError } from '../../../../shared/errors/AppError';
import type { IStockPriceRepository } from '../../infrastructure/IStockPriceRepository';
import type { IAlphaVantageService } from '../../infrastructure/IAlphaVantageService';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
const rateLimited = (symbol: string) =>
  new StockPriceProviderError(symbol, 'RATE_LIMITED', 'Alpha Vantage rate limit reached');

function setup() {
  const repo: jest.Mocked<IStockPriceRepository> = {
    findBySymbol: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    deleteExpired: jest.fn(),
  };
  const provider: jest.Mocked<IAlphaVantageService> = { fetchStockPrice: jest.fn() };
  const accounts = { getDistinctActiveSymbols: jest.fn().mockResolvedValue(['VOO', 'AMZN']) } as unknown as IAccountRepository;
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  return { repo, provider, useCase: new GetCurrentStockPriceUseCase(repo, provider, accounts) };
}

describe('GetCurrentStockPriceUseCase provider failures', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the last cached DB price, marked stale, when the provider is rate-limited', async () => {
    const { repo, provider, useCase } = setup();
    const cachedAt = hoursAgo(30);
    repo.findBySymbol.mockResolvedValue(new StockPrice('VOO', 698.12, cachedAt));
    provider.fetchStockPrice.mockRejectedValue(rateLimited('VOO'));

    const result = await useCase.execute('voo');

    expect(result.price).toBe(698.12);
    expect(result.source).toBe('stale');
    expect(result.cachedAt).toEqual(cachedAt);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('falls back to the stale price on a forced refresh too', async () => {
    const { repo, provider, useCase } = setup();
    repo.findBySymbol.mockResolvedValue(new StockPrice('AMZN', 210, hoursAgo(1)));
    provider.fetchStockPrice.mockRejectedValue(rateLimited('AMZN'));

    const result = await useCase.execute('AMZN', true);

    expect(result.source).toBe('stale');
    expect(result.price).toBe(210);
  });

  it('prefers the in-memory stale price when the DB read also fails', async () => {
    const { repo, provider, useCase } = setup();
    useCase['localCache'].set('VOO', new StockPrice('VOO', 700, hoursAgo(5), 'api'));
    repo.findBySymbol.mockRejectedValue(new DatabaseError('down'));
    provider.fetchStockPrice.mockRejectedValue(rateLimited('VOO'));

    const result = await useCase.execute('VOO');
    expect(result).toMatchObject({ price: 700, source: 'stale' });
  });

  it('throws PRICE_UNAVAILABLE (retryable, 503) when there is no cached price at all', async () => {
    const { provider, useCase } = setup();
    provider.fetchStockPrice.mockRejectedValue(rateLimited('VOO'));

    const err = await useCase.execute('VOO').catch((e) => e);

    expect(err).toBeInstanceOf(PriceUnavailableError);
    expect(err).toMatchObject({ statusCode: 503, code: 'PRICE_UNAVAILABLE', retryable: true, isOperational: true });
    expect(err.retryAfterSeconds).toBeGreaterThan(0);
    expect(err.message).toMatch(/VOO/);
  });

  it('marks a rejected API key as not retryable', async () => {
    const { provider, useCase } = setup();
    provider.fetchStockPrice.mockRejectedValue(new StockPriceProviderError('VOO', 'AUTH', 'key rejected'));

    const err = await useCase.execute('VOO').catch((e) => e);
    expect(err).toMatchObject({ code: 'PRICE_UNAVAILABLE', retryable: false });
  });

  it('maps an unknown symbol to 404 NotFound', async () => {
    const { provider, useCase } = setup();
    provider.fetchStockPrice.mockRejectedValue(new StockPriceProviderError('ZZZZ', 'SYMBOL_NOT_FOUND', 'no quote'));

    await expect(useCase.execute('ZZZZ')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('still fetches from the provider when the DB cache read fails', async () => {
    const { repo, provider, useCase } = setup();
    repo.findBySymbol.mockRejectedValue(new DatabaseError('down'));
    provider.fetchStockPrice.mockResolvedValue(701);

    await expect(useCase.execute('VOO')).resolves.toMatchObject({ price: 701, source: 'api' });
  });

  it('returns the fresh price even if caching it in the DB fails', async () => {
    const { repo, provider, useCase } = setup();
    repo.save.mockRejectedValue(new DatabaseError('down'));
    provider.fetchStockPrice.mockResolvedValue(701);

    await expect(useCase.execute('VOO')).resolves.toMatchObject({ price: 701, source: 'api' });
  });

  it('deduplicates concurrent provider calls for the same symbol', async () => {
    const { provider, useCase } = setup();
    let resolve!: (v: number) => void;
    provider.fetchStockPrice.mockReturnValue(new Promise((r) => { resolve = r; }));

    const both = Promise.all([useCase.execute('VOO'), useCase.execute('voo')]);
    await new Promise((r) => setImmediate(r));
    resolve(702);

    const [a, b] = await both;
    expect(a.price).toBe(702);
    expect(b.price).toBe(702);
    expect(provider.fetchStockPrice).toHaveBeenCalledTimes(1);
  });
});
