import 'reflect-metadata';
import { AlphaVantageService } from './AlphaVantageService';
import { StockPriceProviderError } from './StockPriceProviderError';

const RATE_LIMIT_INFO =
  'Thank you for using Alpha Vantage! Please consider spreading out your free API requests more sparingly ' +
  '(1 request per second). You may subscribe to any of the premium plans at https://www.alphavantage.co/premium/ ' +
  'to lift the free key rate limit (25 requests per day), raise the per-second burst limit, and instantly unlock all premium endpoints';

const quote = (price: string) => ({ 'Global Quote': { '01. symbol': 'VOO', '05. price': price } });

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('AlphaVantageService', () => {
  const OLD_ENV = process.env;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...OLD_ENV, ALPHA_VANTAGE_API_KEY: 'secret-test-key-123' };
    fetchMock = jest.spyOn(global, 'fetch');
    AlphaVantageService.resetThrottleForTests();
  });

  afterEach(() => {
    fetchMock.mockRestore();
    process.env = OLD_ENV;
  });

  const service = (opts: { minIntervalMs?: number; rateLimitRetryDelayMs?: number } = {}) => {
    const s = new AlphaVantageService();
    s.minIntervalMs = opts.minIntervalMs ?? 0;
    s.rateLimitRetryDelayMs = opts.rateLimitRetryDelayMs ?? 0;
    return s;
  };

  async function expectProviderError(p: Promise<unknown>): Promise<StockPriceProviderError> {
    try {
      await p;
    } catch (err) {
      expect(err).toBeInstanceOf(StockPriceProviderError);
      return err as StockPriceProviderError;
    }
    throw new Error('expected a StockPriceProviderError');
  }

  it('returns the parsed price', async () => {
    fetchMock.mockResolvedValue(jsonResponse(quote('702.31')));
    await expect(service().fetchStockPrice('voo')).resolves.toBe(702.31);
  });

  it('classifies the free-tier "Information" payload as a retryable RATE_LIMITED error (prod 2026-10-23)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ Information: RATE_LIMIT_INFO }));
    const err = await expectProviderError(service().fetchStockPrice('VOO'));
    expect(err.reason).toBe('RATE_LIMITED');
    expect(err.retryable).toBe(true);
    expect(err.symbol).toBe('VOO');
  });

  it('retries a rate-limited call once and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ Information: RATE_LIMIT_INFO }))
      .mockResolvedValueOnce(jsonResponse(quote('210.5')));
    await expect(service().fetchStockPrice('AMZN')).resolves.toBe(210.5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry more than once', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ Information: RATE_LIMIT_INFO }));
    await expectProviderError(service().fetchStockPrice('AMZN'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('classifies "Note" and HTTP 429 as RATE_LIMITED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute' }));
    expect((await expectProviderError(service().fetchStockPrice('VOO'))).reason).toBe('RATE_LIMITED');
    fetchMock.mockResolvedValue(jsonResponse({}, 429));
    expect((await expectProviderError(service().fetchStockPrice('VOO'))).reason).toBe('RATE_LIMITED');
  });

  it('classifies an invalid/missing key message as non-retryable AUTH', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      Information: 'the parameter apikey is invalid or missing. Please claim your free API key on (https://www.alphavantage.co/support/#api-key).',
    }));
    const err = await expectProviderError(service().fetchStockPrice('VOO'));
    expect(err.reason).toBe('AUTH');
    expect(err.retryable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ 'Error Message': 'Invalid API call.' }],
    [{ 'Global Quote': {} }],
  ])('classifies %p as non-retryable SYMBOL_NOT_FOUND', async (body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    const err = await expectProviderError(service().fetchStockPrice('ZZZZ'));
    expect(err.reason).toBe('SYMBOL_NOT_FOUND');
    expect(err.retryable).toBe(false);
  });

  it('classifies network failures and 5xx as retryable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const net = await expectProviderError(service().fetchStockPrice('VOO'));
    expect(net.reason).toBe('NETWORK');
    expect(net.retryable).toBe(true);

    fetchMock.mockResolvedValue(jsonResponse({}, 503));
    const upstream = await expectProviderError(service().fetchStockPrice('VOO'));
    expect(upstream.reason).toBe('UPSTREAM');
    expect(upstream.retryable).toBe(true);
  });

  it('never includes the API key in error messages', async () => {
    fetchMock.mockRejectedValue(new TypeError('request to https://www.alphavantage.co/query?apikey=secret-test-key-123 failed'));
    const err = await expectProviderError(service().fetchStockPrice('VOO'));
    expect(err.message).not.toContain('secret-test-key-123');
  });

  it('spaces out concurrent calls to respect the 1 request/second burst limit', async () => {
    const calledAt: number[] = [];
    fetchMock.mockImplementation(async () => {
      calledAt.push(Date.now());
      return jsonResponse(quote('1'));
    });
    const s = service({ minIntervalMs: 120 });
    await Promise.all([s.fetchStockPrice('VOO'), s.fetchStockPrice('AMZN'), s.fetchStockPrice('AAPL')]);
    expect(calledAt).toHaveLength(3);
    expect(calledAt[1] - calledAt[0]).toBeGreaterThanOrEqual(110);
    expect(calledAt[2] - calledAt[1]).toBeGreaterThanOrEqual(110);
  });

  it('shares the throttle across instances (DI registers the service as transient)', async () => {
    const calledAt: number[] = [];
    fetchMock.mockImplementation(async () => {
      calledAt.push(Date.now());
      return jsonResponse(quote('1'));
    });
    await Promise.all([
      service({ minIntervalMs: 120 }).fetchStockPrice('VOO'),
      service({ minIntervalMs: 120 }).fetchStockPrice('AMZN'),
    ]);
    expect(calledAt[1] - calledAt[0]).toBeGreaterThanOrEqual(110);
  });
});
