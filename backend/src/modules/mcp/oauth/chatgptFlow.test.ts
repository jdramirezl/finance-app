/**
 * End-to-end OAuth run with a scripted client that behaves like ChatGPT's
 * connector, against the real Express routers (OAuth + /mcp) on a loopback
 * port. Supabase is replaced by an in-memory store and a fake session check;
 * the finance use cases are mocked.
 *
 * Steps mirror developers.openai.com/plugins/build/auth:
 *   401 + WWW-Authenticate → protected-resource metadata → AS metadata →
 *   authorize (CIMD client_id, PKCE S256, resource) → consent (owner session) →
 *   callback with code+state+iss (RFC 9207 check) → token → MCP calls → refresh.
 */
import 'reflect-metadata';
import express, { Request, RequestHandler, Response } from 'express';
import request from 'supertest';
import { container, DependencyContainer } from 'tsyringe';
import { withLocalServer } from '../testkit.test-helper';
import { createMcpRouter } from '../routes';
import { createOAuthRouters } from './routes';
import { OAuthService } from './service';
import { MemoryOAuthStore } from './memoryStore.test-helper';
import { CHATGPT_CLIENT_ID, CHATGPT_REDIRECT, fakeResolver, pkcePair } from './fixtures.test-helper';
import { GetAllAccountsUseCase } from '../../accounts/application/useCases/GetAllAccountsUseCase';
import { CreateMovementUseCase } from '../../movements/application/useCases/CreateMovementUseCase';

const STATIC_TOKEN = 's'.repeat(64);
const OWNER = '11111111-2222-4333-8444-555555555555';
const OTHER = '99999999-2222-4333-8444-555555555555';
/** Fake finance-app Supabase sessions (what the consent page sends). */
const SESSIONS: Record<string, string> = { 'owner-session': OWNER, 'other-session': OTHER };

const ACC = '0b6f3c1e-8f2a-4d5b-9c7e-1a2b3c4d5e6f';
const POC = '1c7a4d2f-9a3b-4e6c-8d8f-2b3c4d5e6f70';
const MOVEMENT = { type: 'EgresoNormal', accountId: ACC, pocketId: POC, amount: 1000, displayedDate: '2026-11-25', notes: '[mcp-test]' };

const fakeSupabaseAuth: RequestHandler = (req, res, next) => {
  const token = (req.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const id = SESSIONS[token];
  if (!id) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  req.user = { id };
  next();
};

/** Mirrors server.ts mounting order. */
function buildApp(service: OAuthService, di: DependencyContainer) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const oauth = createOAuthRouters({ service: () => service, authenticate: fakeSupabaseAuth });
  app.use('/.well-known', oauth.wellKnown);
  app.use('/oauth', oauth.oauth);
  app.use('/api/mcp/grants', oauth.grants);
  app.use('/mcp', createMcpRouter({ oauthService: () => service, di }));
  app.use((req: Request, res: Response) => { res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }); });
  return app;
}

/** Parses `Bearer a="b", c="d"` into { a: 'b', c: 'd' }. */
function parseChallenge(header: string): Record<string, string> {
  return Object.fromEntries([...header.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}

class ChatGptLikeClient {
  issuer = '';
  resource = '';
  tokenEndpoint = '';
  accessToken = '';
  refreshToken = '';
  private verifier = '';
  private state = '';

  constructor(private readonly base: string) {}

  mcp(method: string, params: Record<string, unknown> = {}, token: string | null = this.accessToken) {
    const r = request(this.base).post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .set('MCP-Protocol-Version', '2025-06-18');
    if (token) r.set('Authorization', `Bearer ${token}`);
    return r.send({ jsonrpc: '2.0', id: 1, method, params });
  }

  /** Discovery exactly as the MCP spec requires a client to do it. */
  async discover() {
    const unauth = await this.mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'chatgpt-like', version: '1' } }, null);
    expect(unauth.status).toBe(401);
    const challenge = parseChallenge(unauth.headers['www-authenticate']);
    expect(challenge.scope).toBe('finance:read finance:write');

    const prm = await request(challenge.resource_metadata).get('');
    expect(prm.status).toBe(200);
    this.resource = prm.body.resource;
    expect(this.resource).toBe(`${this.base}/mcp`);
    const [issuer] = prm.body.authorization_servers;

    const as = await request(`${issuer}/.well-known/oauth-authorization-server`).get('');
    expect(as.status).toBe(200);
    // RFC 8414 §3.3: issuer must be identical to the one used to build the URL.
    expect(as.body.issuer).toBe(issuer);
    expect(as.body.code_challenge_methods_supported).toContain('S256');
    expect(as.body.client_id_metadata_document_supported).toBe(true);
    expect(as.body.authorization_response_iss_parameter_supported).toBe(true);
    expect(as.body.token_endpoint_auth_methods_supported).toContain('none');
    expect(as.body.registration_endpoint).toBeUndefined();
    this.issuer = as.body.issuer;
    this.tokenEndpoint = as.body.token_endpoint;
    return as.body;
  }

  /** Builds the authorization request and returns where the browser lands (the consent page). */
  async startAuthorization(scope = 'finance:read finance:write offline_access') {
    const { verifier, challenge } = pkcePair();
    this.verifier = verifier;
    this.state = `state-${Math.random()}`;
    const res = await request(`${this.issuer}/oauth/authorize`).get('').query({
      response_type: 'code',
      client_id: CHATGPT_CLIENT_ID,
      redirect_uri: CHATGPT_REDIRECT,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: this.state,
      scope,
      resource: this.resource,
    });
    expect(res.status).toBe(302);
    expect(res.headers['cache-control']).toBe('no-store');
    return new URL(res.headers.location);
  }

  /** What ChatGPT does when the browser returns to its redirect URI. */
  async handleCallback(callback: string) {
    const url = new URL(callback);
    expect(`${url.origin}${url.pathname}`).toBe(CHATGPT_REDIRECT);
    expect(url.searchParams.get('state')).toBe(this.state);
    // RFC 9207: reject if iss is missing or differs from the recorded issuer.
    expect(url.searchParams.get('iss')).toBe(this.issuer);
    const code = url.searchParams.get('code');
    if (!code) return { error: url.searchParams.get('error') };

    const res = await request(this.tokenEndpoint).post('').type('form').send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CHATGPT_REDIRECT,
      client_id: CHATGPT_CLIENT_ID,
      code_verifier: this.verifier,
      resource: this.resource,
    });
    expect(res.headers['cache-control']).toBe('no-store');
    if (res.status === 200) {
      this.accessToken = res.body.access_token;
      this.refreshToken = res.body.refresh_token;
    }
    return { code, status: res.status, body: res.body };
  }

  refresh(token = this.refreshToken) {
    return request(this.tokenEndpoint).post('').type('form').send({
      grant_type: 'refresh_token', refresh_token: token, client_id: CHATGPT_CLIENT_ID, resource: this.resource,
    });
  }
}

/** The finance-app consent page: same two API calls the frontend makes. */
async function userOnConsentPage(base: string, consentUrl: URL, session: string, approve: boolean) {
  const handle = consentUrl.searchParams.get('request') as string;
  const details = await request(base).get(`/oauth/requests/${handle}`).set('Authorization', `Bearer ${session}`);
  const decision = await request(base).post(`/oauth/requests/${handle}/decision`)
    .set('Authorization', `Bearer ${session}`).send({ approve });
  return { details, decision };
}

describe('ChatGPT-like OAuth flow against /mcp', () => {
  const env = { ...process.env };
  let store: MemoryOAuthStore;
  let service: OAuthService;
  let di: DependencyContainer;
  const uc = { accounts: { execute: jest.fn() }, create: { execute: jest.fn() } };
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.MCP_TOKEN = STATIC_TOKEN;
    process.env.MCP_OWNER_USER_ID = OWNER;
    process.env.MCP_CONSENT_URL = 'https://frontend.example/oauth/consent';
    delete process.env.MCP_PUBLIC_URL;
    store = new MemoryOAuthStore();
    service = new OAuthService({ store, clients: fakeResolver().resolver });
    di = container.createChildContainer();
    uc.accounts.execute.mockReset().mockResolvedValue([{ id: ACC, name: 'Bancolombia', currency: 'COP', balance: 1 }]);
    uc.create.execute.mockReset().mockImplementation(async (body) => ({ id: 'mov-1', ...body }));
    di.registerInstance(GetAllAccountsUseCase, uc.accounts as never);
    di.registerInstance(CreateMovementUseCase, uc.create as never);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => logSpy.mockRestore());
  afterAll(() => { process.env = env; });

  const run = (fn: (base: string, client: ChatGptLikeClient) => Promise<void>) =>
    withLocalServer(buildApp(service, di), (base) => fn(base, new ChatGptLikeClient(base)));

  async function connect(base: string, client: ChatGptLikeClient, scope?: string) {
    await client.discover();
    const consent = await client.startAuthorization(scope);
    expect(consent.origin + consent.pathname).toBe('https://frontend.example/oauth/consent');
    const { details, decision } = await userOnConsentPage(base, consent, 'owner-session', true);
    expect(details.status).toBe(200);
    expect(decision.status).toBe(200);
    return client.handleCallback(decision.body.redirectTo);
  }

  it('connects, reads, writes, refreshes and is disconnected from Settings', () => run(async (base, client) => {
    const exchanged = await connect(base, client);
    expect(exchanged.status).toBe(200);
    expect(exchanged.body).toMatchObject({ token_type: 'Bearer', expires_in: 3600, scope: 'finance:read finance:write' });

    // tools/list advertises OAuth security schemes and correct annotations.
    const list = await client.mcp('tools/list');
    expect(list.status).toBe(200);
    const tools = list.body.result.tools as Array<{ name: string; annotations: Record<string, boolean>; _meta: Record<string, unknown> }>;
    expect(tools).toHaveLength(13);
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    expect(byName.finance_list_accounts.annotations.readOnlyHint).toBe(true);
    expect(byName.finance_list_accounts._meta.securitySchemes).toEqual([{ type: 'oauth2', scopes: ['finance:read'] }]);
    expect(byName.finance_delete_movement.annotations.destructiveHint).toBe(true);
    expect(byName.finance_create_movement._meta.securitySchemes).toEqual([{ type: 'oauth2', scopes: ['finance:write'] }]);

    // One read and one write, both acting as the owner.
    const read = await client.mcp('tools/call', { name: 'finance_list_accounts', arguments: {} });
    expect(read.body.result.isError).toBeFalsy();
    expect(uc.accounts.execute).toHaveBeenCalledWith(OWNER, true, false);
    const write = await client.mcp('tools/call', { name: 'finance_create_movement', arguments: MOVEMENT });
    expect(write.body.result.isError).toBeFalsy();
    expect(uc.create.execute).toHaveBeenCalledWith(MOVEMENT, OWNER);

    // Refresh rotates; the new access token works.
    const oldAccess = client.accessToken;
    const refreshed = await client.refresh();
    expect(refreshed.status).toBe(200);
    client.accessToken = refreshed.body.access_token;
    client.refreshToken = refreshed.body.refresh_token;
    expect((await client.mcp('tools/list')).status).toBe(200);
    expect((await client.mcp('tools/list', {}, oldAccess)).status).toBe(200); // still valid until it expires

    // Settings → "Revocar acceso de ChatGPT".
    const grants = await request(base).get('/api/mcp/grants').set('Authorization', 'Bearer owner-session');
    expect(grants.body.data).toHaveLength(1);
    const revoked = await request(base).post('/api/mcp/grants/revoke-all').set('Authorization', 'Bearer owner-session');
    expect(revoked.body).toEqual({ revoked: 1 });

    const after = await client.mcp('tools/list');
    expect(after.status).toBe(401);
    expect(parseChallenge(after.headers['www-authenticate'])).toMatchObject({ error: 'invalid_token' });
    expect((await client.refresh()).body.error).toBe('invalid_grant');

    // The static token for Claude Desktop / scripts is unaffected.
    expect((await client.mcp('tools/list', {}, STATIC_TOKEN)).status).toBe(200);
  }));

  it('never issues a token to another finance-app user', () => run(async (base, client) => {
    await client.discover();
    const consent = await client.startAuthorization();
    const { details, decision } = await userOnConsentPage(base, consent, 'other-session', true);
    expect(details.status).toBe(403);
    expect(decision.status).toBe(403);
    expect(await client.handleCallback(decision.body.redirectTo)).toEqual({ error: 'access_denied' });
    // The burned request cannot be approved afterwards by the owner either.
    const retry = await userOnConsentPage(base, consent, 'owner-session', true);
    expect(retry.decision.status).toBe(404);
    expect(store.grants).toHaveLength(0);
  }));

  it('requires a finance-app session on the consent API', () => run(async (base, client) => {
    await client.discover();
    const consent = await client.startAuthorization();
    const handle = consent.searchParams.get('request');
    expect((await request(base).get(`/oauth/requests/${handle}`)).status).toBe(401);
    expect((await request(base).post(`/oauth/requests/${handle}/decision`).send({ approve: true })).status).toBe(401);
    expect((await request(base).post('/api/mcp/grants/revoke-all')).status).toBe(401);
  }));

  it('a denial returns access_denied to ChatGPT', () => run(async (base, client) => {
    await client.discover();
    const consent = await client.startAuthorization();
    const { decision } = await userOnConsentPage(base, consent, 'owner-session', false);
    expect(await client.handleCallback(decision.body.redirectTo)).toEqual({ error: 'access_denied' });
  }));

  it('replaying the authorization code revokes the connection', () => run(async (base, client) => {
    const first = await connect(base, client);
    const replay = await request(client.tokenEndpoint).post('').type('form').send({
      grant_type: 'authorization_code', code: first.code, redirect_uri: CHATGPT_REDIRECT,
      client_id: CHATGPT_CLIENT_ID, code_verifier: 'x'.repeat(43), resource: client.resource,
    });
    expect(replay.body.error).toBe('invalid_grant');
    expect((await client.mcp('tools/list')).status).toBe(401);
  }));

  it('a read-only connection gets a scope challenge on writes', () => run(async (base, client) => {
    const exchanged = await connect(base, client, 'finance:read');
    expect(exchanged.body.scope).toBe('finance:read');
    const write = await client.mcp('tools/call', { name: 'finance_create_movement', arguments: MOVEMENT });
    expect(write.body.result.isError).toBe(true);
    expect(write.body.result.structuredContent.error.code).toBe('FORBIDDEN');
    const [challenge] = write.body.result._meta['mcp/www_authenticate'];
    expect(parseChallenge(challenge)).toMatchObject({ error: 'insufficient_scope', scope: 'finance:read finance:write' });
    expect(uc.create.execute).not.toHaveBeenCalled();
  }));

  it('a token is only valid for the deployment it was minted for', () => run(async (base, client) => {
    await connect(base, client);
    process.env.MCP_PUBLIC_URL = 'https://some-other-deployment.example';
    expect((await client.mcp('tools/list')).status).toBe(401);
  }));

  it('tokens stop working if MCP_OWNER_USER_ID changes', () => run(async (base, client) => {
    await connect(base, client);
    process.env.MCP_OWNER_USER_ID = OTHER;
    expect((await client.mcp('tools/list')).status).toBe(401);
  }));

  it('authorize refuses unknown clients and redirect URIs without redirecting', () => run(async (base, client) => {
    await client.discover();
    const { challenge } = pkcePair();
    const common = { response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', state: 's' };
    for (const query of [
      { ...common, client_id: 'https://evil.example/client.json', redirect_uri: CHATGPT_REDIRECT },
      { ...common, client_id: CHATGPT_CLIENT_ID, redirect_uri: 'https://evil.example/cb' },
    ]) {
      const res = await request(base).get('/oauth/authorize').query(query);
      expect(res.status).toBe(400);
      expect(res.headers.location).toBeUndefined();
      expect(res.text).not.toContain('<script');
    }
    expect(store.authorizations).toHaveLength(0);
  }));
});
