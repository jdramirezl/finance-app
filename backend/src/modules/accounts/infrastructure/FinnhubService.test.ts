import 'reflect-metadata';
import { FinnhubService } from './FinnhubService';
import { StockPriceProviderError } from './StockPriceProviderError';

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const quote = (c: number, t = 1792783326) => ({ c, d: 0, dp: 0, h: c, l: c, o: c, pc: c, t });

describe('FinnhubService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  async function providerError(p: Promise<unknown>): Promise<StockPriceProviderError> {
    const err = await p.then(() => null, (e) => e);
    expect(err).toBeInstanceOf(StockPriceProviderError);
    return err as StockPriceProviderError;
  }

  it('returns the current price and sends the key as a header, not in the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(quote(699.1)));
    const svc = new FinnhubService('fh-secret-key');

    await expect(svc.fetchStockPrice('voo')).resolves.toBe(699.1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://finnhub.io/api/v1/quote?symbol=VOO');
    expect(String(url)).not.toContain('fh-secret-key');
    expect((init as RequestInit).headers).toMatchObject({ 'X-Finnhub-Token': 'fh-secret-key' });
  });

  it('exposes name and an effectively unlimited daily budget', () => {
    const svc = new FinnhubService('k');
    expect(svc.name).toBe('finnhub');
    expect(svc.dailyCallBudget).toBe(Infinity);
  });

  it('treats an all-zero quote (unknown symbol) as SYMBOL_NOT_FOUND', async () => {
    fetchMock.mockResolvedValue(jsonResponse(quote(0, 0)));
    expect((await providerError(new FinnhubService('k').fetchStockPrice('ZZZZQ'))).reason).toBe('SYMBOL_NOT_FOUND');
  });

  it.each([
    [429, 'RATE_LIMITED', true],
    [401, 'AUTH', false],
    [403, 'AUTH', false],
    [502, 'UPSTREAM', true],
  ])('maps HTTP %s to %s', async (status, reason, retryable) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'x' }, status));
    const err = await providerError(new FinnhubService('k').fetchStockPrice('VOO'));
    expect(err.reason).toBe(reason);
    expect(err.retryable).toBe(retryable);
  });

  it('maps a network failure to NETWORK without leaking the key', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed for token fh-secret-key'));
    const err = await providerError(new FinnhubService('fh-secret-key').fetchStockPrice('VOO'));
    expect(err.reason).toBe('NETWORK');
    expect(err.message).not.toContain('fh-secret-key');
  });

  it('maps a non-JSON or malformed body to UPSTREAM', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }));
    expect((await providerError(new FinnhubService('k').fetchStockPrice('VOO'))).reason).toBe('UPSTREAM');
  });
});
