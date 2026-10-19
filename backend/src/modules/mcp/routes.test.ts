import 'reflect-metadata';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { withLocalServer } from './testkit.test-helper';
import mcpRoutes from './routes';
import { verifyToken } from './auth';

const TOKEN = 'a'.repeat(64);
const OWNER = '11111111-2222-4333-8444-555555555555';

// Mirrors server.ts: json parser → routes → /mcp → 404 catch-all.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/api', (_req, res) => { res.json({ ok: true }); });
  app.use('/mcp', mcpRoutes);
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
  });
  return app;
}

const rpc = (method: string, params: Record<string, unknown> = {}, id = 1) => ({ jsonrpc: '2.0', id, method, params });
const initParams = {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'jest', version: '0.0.0' },
};

// IPv4-loopback server per request (see testkit.test-helper.ts for why).
const call = (app: express.Express, fn: (agent: ReturnType<typeof request>) => request.Test) =>
  withLocalServer(app, (url) => fn(request(url)).then((r) => r));

const post = (app: express.Express, body: unknown, token: string | null = TOKEN) =>
  call(app, (agent) => {
    const r = agent
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .set('MCP-Protocol-Version', '2025-06-18');
    if (token !== null) r.set('Authorization', `Bearer ${token}`);
    return r.send(body as object);
  });

describe('MCP endpoint', () => {
  const env = { ...process.env };
  let app: express.Express;

  beforeEach(() => {
    process.env.MCP_TOKEN = TOKEN;
    process.env.MCP_OWNER_USER_ID = OWNER;
    app = buildApp();
  });
  afterAll(() => { process.env = env; });

  describe('auth', () => {
    it.each([
      ['no token', null],
      ['wrong token', 'b'.repeat(64)],
      ['wrong-length token', 'short'],
    ])('rejects %s with 401 + WWW-Authenticate', async (_label, token) => {
      const res = await post(app, rpc('initialize', initParams), token);
      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toMatch(/^Bearer resource_metadata="http:\/\/.+\/\.well-known\/oauth-protected-resource"$/);
      expect(res.body).toEqual({ error: { code: 'UNAUTHORIZED', message: expect.any(String), retryable: false } });
    });

    it('rejects a non-Bearer scheme', async () => {
      const res = await call(app, (a) => a.post('/mcp').set('Authorization', `Basic ${TOKEN}`).send(rpc('initialize', initParams)));
      expect(res.status).toBe(401);
    });

    it.each(['MCP_TOKEN', 'MCP_OWNER_USER_ID'])('fails closed when %s is missing', async (key) => {
      delete process.env[key];
      const res = await post(app, rpc('initialize', initParams));
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('MCP_NOT_CONFIGURED');
    });

    it('verifyToken returns the owner id only for the exact token', () => {
      expect(verifyToken(TOKEN)).toBe(OWNER);
      expect(verifyToken(`${TOKEN} `)).toBeNull();
      expect(verifyToken('')).toBeNull();
    });
  });

  describe('protocol', () => {
    it('initialize returns a JSON-RPC result with server info', async () => {
      const res = await post(app, rpc('initialize', initParams));
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['mcp-session-id']).toBeUndefined();
      expect(res.body.result.serverInfo).toMatchObject({ name: 'finance-app' });
      expect(res.body.result.capabilities.tools).toBeDefined();
    });

    it('tools/list works without a prior initialize (stateless)', async () => {
      const res = await post(app, rpc('tools/list'));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.result.tools)).toBe(true);
    });

    it.each(['get', 'delete'] as const)('%s returns 405', async (method) => {
      const res = await call(app, (a) => a[method]('/mcp').set('Authorization', `Bearer ${TOKEN}`));
      expect(res.status).toBe(405);
      expect(res.headers.allow).toBe('POST');
    });
  });

  describe('existing routing is unchanged', () => {
    it('serves other routes and keeps the 404 catch-all', async () => {
      expect((await call(app, (a) => a.get('/api'))).status).toBe(200);
      const res = await call(app, (a) => a.get('/nope'));
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Route GET /nope not found');
    });
  });
});
