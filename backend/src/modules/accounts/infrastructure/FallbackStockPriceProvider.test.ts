import 'reflect-metadata';
import { FallbackStockPriceProvider } from './FallbackStockPriceProvider';
import { StockPriceProviderError, StockPriceProviderFailure } from './StockPriceProviderError';
import type { IStockPriceProvider } from './IStockPriceProvider';

const provider = (name: string, budget: number, impl: (symbol: string) => Promise<number>): jest.Mocked<IStockPriceProvider> => ({
  name,
  dailyCallBudget: budget,
  fetchStockPrice: jest.fn(impl),
});
const fail = (reason: StockPriceProviderFailure) => (_symbol: string) =>
  Promise.reject(new StockPriceProviderError('VOO', reason, `${reason} detail`));

describe('FallbackStockPriceProvider', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('uses the primary provider and reports its name', async () => {
    const fh = provider('finnhub', Infinity, async () => 699.1);
    const av = provider('alphavantage', 25, async () => 1);
    const chain = new FallbackStockPriceProvider([fh, av]);

    await expect(chain.fetchQuote('VOO')).resolves.toEqual({ price: 699.1, provider: 'finnhub' });
    expect(av.fetchStockPrice).not.toHaveBeenCalled();
    await expect(chain.fetchStockPrice('VOO')).resolves.toBe(699.1);
  });

  it('falls back to the next provider when the primary fails', async () => {
    const chain = new FallbackStockPriceProvider([
      provider('finnhub', Infinity, fail('RATE_LIMITED')),
      provider('alphavantage', 25, async () => 700),
    ]);
    await expect(chain.fetchQuote('VOO')).resolves.toEqual({ price: 700, provider: 'alphavantage' });
  });

  it('also falls back when the primary does not know the symbol', async () => {
    const chain = new FallbackStockPriceProvider([
      provider('finnhub', Infinity, fail('SYMBOL_NOT_FOUND')),
      provider('alphavantage', 25, async () => 12),
    ]);
    await expect(chain.fetchQuote('VOO')).resolves.toMatchObject({ provider: 'alphavantage' });
  });

  it('throws SYMBOL_NOT_FOUND only when every provider says so', async () => {
    const chain = new FallbackStockPriceProvider([
      provider('finnhub', Infinity, fail('SYMBOL_NOT_FOUND')),
      provider('alphavantage', 25, fail('SYMBOL_NOT_FOUND')),
    ]);
    const err = await chain.fetchQuote('VOO').catch((e) => e);
    expect(err).toMatchObject({ reason: 'SYMBOL_NOT_FOUND' });
  });

  it('prefers a retryable reason and mentions every provider when all fail', async () => {
    const chain = new FallbackStockPriceProvider([
      provider('finnhub', Infinity, fail('AUTH')),
      provider('alphavantage', 25, fail('RATE_LIMITED')),
    ]);
    const err = await chain.fetchQuote('VOO').catch((e) => e);
    expect(err).toBeInstanceOf(StockPriceProviderError);
    expect(err.reason).toBe('RATE_LIMITED');
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/finnhub/);
    expect(err.message).toMatch(/alphavantage/);
  });

  it('wraps a non-provider error as UPSTREAM', async () => {
    const chain = new FallbackStockPriceProvider([provider('finnhub', Infinity, () => Promise.reject(new Error('boom')))]);
    await expect(chain.fetchQuote('VOO')).rejects.toMatchObject({ reason: 'UPSTREAM' });
  });

  it('takes its daily budget and name from the primary provider', () => {
    const chain = new FallbackStockPriceProvider([
      provider('finnhub', Infinity, async () => 1),
      provider('alphavantage', 25, async () => 1),
    ]);
    expect(chain.dailyCallBudget).toBe(Infinity);
    expect(chain.name).toBe('finnhub+alphavantage');
  });

  it('requires at least one provider', () => {
    expect(() => new FallbackStockPriceProvider([])).toThrow();
  });
});
