import { OAuthService } from './service';
import { MemoryOAuthStore } from './memoryStore.test-helper';
import { CHATGPT_CLIENT_ID, CHATGPT_REDIRECT, fakeResolver, pkcePair } from './fixtures.test-helper';
import { hashSecret } from './crypto';

const ISSUER = 'https://backend.example';
const RESOURCE = `${ISSUER}/mcp`;
const OWNER = '11111111-2222-4333-8444-555555555555';
const OTHER = '99999999-2222-4333-8444-555555555555';

describe('OAuthService', () => {
  let store: MemoryOAuthStore;
  let clock: number;
  let owner: string | undefined;
  let svc: OAuthService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    store = new MemoryOAuthStore();
    clock = Date.parse('2026-11-25T12:00:00Z');
    owner = OWNER;
    svc = new OAuthService({ store, clients: fakeResolver().resolver, ownerId: () => owner, now: () => new Date(clock) });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => logSpy.mockRestore());

  const authorizeParams = (challenge: string, extra: Record<string, unknown> = {}) => ({
    response_type: 'code',
    client_id: CHATGPT_CLIENT_ID,
    redirect_uri: CHATGPT_REDIRECT,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'st-1',
    scope: 'finance:read finance:write offline_access',
    resource: RESOURCE,
    ...extra,
  });

  const handleFrom = (location: string) => new URL(location).searchParams.get('request') as string;

  /** Runs authorize + owner approval; returns the code and its verifier. */
  async function approvedCode(extra: Record<string, unknown> = {}) {
    const { verifier, challenge } = pkcePair();
    const out = await svc.authorize(authorizeParams(challenge, extra), ISSUER, RESOURCE);
    if (out.kind !== 'redirect') throw new Error(out.description);
    const decision = await svc.decide(handleFrom(out.location), OWNER, true);
    if (!decision.ok) throw new Error(decision.error);
    const code = new URL(decision.redirectTo).searchParams.get('code') as string;
    return { code, verifier };
  }

  const exchange = (code: string, verifier: string, extra: Record<string, unknown> = {}) =>
    svc.token({
      grant_type: 'authorization_code', code, code_verifier: verifier,
      client_id: CHATGPT_CLIENT_ID, redirect_uri: CHATGPT_REDIRECT, resource: RESOURCE, ...extra,
    }, ISSUER);

  describe('authorize', () => {
    it('stores only hashes and sends the user to the consent page', async () => {
      const { challenge } = pkcePair();
      const out = await svc.authorize(authorizeParams(challenge), ISSUER, RESOURCE);
      expect(out.kind).toBe('redirect');
      const handle = handleFrom((out as { location: string }).location);
      expect(handle).toHaveLength(43);
      expect(store.authorizations[0].handleHash).toBe(hashSecret(handle));
      expect(JSON.stringify(store.authorizations)).not.toContain(handle);
      expect(store.authorizations[0].scope).toBe('finance:read finance:write');
    });

    it.each([
      ['missing client_id', { client_id: undefined }],
      ['unknown client', { client_id: 'https://evil.example/client.json' }],
      ['unregistered redirect', { redirect_uri: 'https://evil.example/cb' }],
      ['missing redirect', { redirect_uri: undefined }],
    ])('shows an error page (never redirects) for %s', async (_l, extra) => {
      const out = await svc.authorize(authorizeParams(pkcePair().challenge, extra), ISSUER, RESOURCE);
      expect(out.kind).toBe('error_page');
      expect(store.authorizations).toHaveLength(0);
    });

    it.each([
      ['token response type', { response_type: 'token' }, 'unsupported_response_type'],
      ['plain PKCE', { code_challenge_method: 'plain' }, 'invalid_request'],
      ['no PKCE', { code_challenge: undefined, code_challenge_method: undefined }, 'invalid_request'],
      ['malformed challenge', { code_challenge: 'short' }, 'invalid_request'],
      ['other resource', { resource: 'https://other.example/mcp' }, 'invalid_target'],
    ])('redirects back with an error for %s, carrying state and iss', async (_l, extra, error) => {
      const out = await svc.authorize(authorizeParams(pkcePair().challenge, extra), ISSUER, RESOURCE);
      expect(out.kind).toBe('redirect');
      const url = new URL((out as { location: string }).location);
      expect(url.origin + url.pathname).toBe(CHATGPT_REDIRECT);
      expect(url.searchParams.get('error')).toBe(error);
      expect(url.searchParams.get('state')).toBe('st-1');
      expect(url.searchParams.get('iss')).toBe(ISSUER);
      expect(store.authorizations).toHaveLength(0);
    });

    it('accepts a resource with a trailing slash', async () => {
      const out = await svc.authorize(authorizeParams(pkcePair().challenge, { resource: `${RESOURCE}/` }), ISSUER, RESOURCE);
      expect((out as { location: string }).location).toContain('request=');
    });
  });

  describe('consent', () => {
    let handle: string;
    beforeEach(async () => {
      const out = await svc.authorize(authorizeParams(pkcePair().challenge), ISSUER, RESOURCE);
      handle = handleFrom((out as { location: string }).location);
    });

    it('shows details to the owner only', async () => {
      expect(await svc.getConsent(handle, OWNER)).toMatchObject({
        ok: true, details: { clientName: 'ChatGPT', redirectHost: 'chatgpt.com', scopes: ['finance:read', 'finance:write'] },
      });
      expect(await svc.getConsent(handle, OTHER)).toEqual({ ok: false, error: 'not_owner' });
      expect(await svc.getConsent('nope', OWNER)).toEqual({ ok: false, error: 'not_found' });
    });

    it('a non-owner decision burns the request and returns access_denied', async () => {
      const res = await svc.decide(handle, OTHER, true);
      expect(res).toMatchObject({ ok: false, error: 'not_owner' });
      expect(new URL((res as { redirectTo: string }).redirectTo).searchParams.get('error')).toBe('access_denied');
      expect(await svc.decide(handle, OWNER, true)).toEqual({ ok: false, error: 'not_found' });
    });

    it('a denial returns access_denied with state and iss', async () => {
      const res = await svc.decide(handle, OWNER, false);
      const url = new URL((res as { redirectTo: string }).redirectTo);
      expect(Object.fromEntries(url.searchParams)).toMatchObject({ error: 'access_denied', state: 'st-1', iss: ISSUER });
    });

    it('expires after 10 minutes', async () => {
      clock += 10 * 60 * 1000 + 1;
      expect(await svc.decide(handle, OWNER, true)).toEqual({ ok: false, error: 'not_found' });
    });

    it('can only be decided once', async () => {
      expect((await svc.decide(handle, OWNER, true)).ok).toBe(true);
      expect(await svc.decide(handle, OWNER, true)).toEqual({ ok: false, error: 'not_found' });
    });

    it('fails closed when no owner is configured', async () => {
      owner = undefined;
      expect(await svc.getConsent(handle, OWNER)).toEqual({ ok: false, error: 'not_owner' });
    });
  });

  describe('token: authorization_code', () => {
    it('issues opaque bearer tokens and stores only their hashes', async () => {
      const { code, verifier } = await approvedCode();
      const res = await exchange(code, verifier);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ token_type: 'Bearer', expires_in: 3600, scope: 'finance:read finance:write' });
      const { access_token, refresh_token } = res.body as Record<string, string>;
      expect(access_token).toMatch(/^fmcp_at_/);
      expect(refresh_token).toMatch(/^fmcp_rt_/);
      const dump = JSON.stringify([store.tokens, store.authorizations]);
      [access_token, refresh_token, code].forEach((secret) => expect(dump).not.toContain(secret));
    });

    it.each([
      ['wrong verifier', { code_verifier: pkcePair().verifier }],
      ['wrong redirect', { redirect_uri: 'https://chatgpt.com/other' }],
      ['wrong client', { client_id: 'https://chatgpt.com/oauth/x/client.json' }],
      ['wrong resource', { resource: 'https://other.example/mcp' }],
    ])('rejects %s with invalid_grant and burns the code', async (_l, extra) => {
      const { code, verifier } = await approvedCode();
      expect((await exchange(code, verifier, extra)).body.error).toBe('invalid_grant');
      expect((await exchange(code, verifier)).body.error).toBe('invalid_grant');
      expect(store.grants).toHaveLength(0);
    });

    it('rejects a code from another issuer', async () => {
      const { code, verifier } = await approvedCode();
      const res = await svc.token({
        grant_type: 'authorization_code', code, code_verifier: verifier, client_id: CHATGPT_CLIENT_ID, redirect_uri: CHATGPT_REDIRECT,
      }, 'https://preview.example');
      expect(res.body.error).toBe('invalid_grant');
    });

    it('rejects an expired code (2 minutes)', async () => {
      const { code, verifier } = await approvedCode();
      clock += 2 * 60 * 1000 + 1;
      expect((await exchange(code, verifier)).body.error).toBe('invalid_grant');
    });

    it('rejects if the owner changed between consent and exchange', async () => {
      const { code, verifier } = await approvedCode();
      owner = OTHER;
      expect((await exchange(code, verifier)).body.error).toBe('invalid_grant');
    });

    it('a replayed code revokes the grant it produced', async () => {
      const { code, verifier } = await approvedCode();
      const first = await exchange(code, verifier);
      expect(first.status).toBe(200);
      expect((await exchange(code, verifier)).body.error).toBe('invalid_grant');
      expect(await svc.verifyAccessToken(first.body.access_token as string, RESOURCE)).toBeNull();
    });

    it.each([
      [{ grant_type: 'client_credentials' }, 'unsupported_grant_type'],
      [{ grant_type: 'authorization_code' }, 'invalid_request'],
      [{ grant_type: 'refresh_token' }, 'invalid_request'],
    ])('rejects %j', async (params, error) => {
      expect((await svc.token(params, ISSUER)).body.error).toBe(error);
    });
  });

  describe('token: refresh_token', () => {
    async function tokens() {
      const { code, verifier } = await approvedCode();
      return (await exchange(code, verifier)).body as Record<string, string>;
    }
    const refresh = (token: string, extra: Record<string, unknown> = {}) =>
      svc.token({ grant_type: 'refresh_token', refresh_token: token, client_id: CHATGPT_CLIENT_ID, resource: RESOURCE, ...extra }, ISSUER);

    it('rotates: new pair works, old refresh token is spent', async () => {
      const t1 = await tokens();
      const t2 = (await refresh(t1.refresh_token)).body as Record<string, string>;
      expect(t2.access_token).toMatch(/^fmcp_at_/);
      expect(t2.refresh_token).not.toBe(t1.refresh_token);
      expect(await svc.verifyAccessToken(t2.access_token, RESOURCE)).not.toBeNull();
    });

    it('reuse within the 60 s grace window is refused without revoking the grant', async () => {
      const t1 = await tokens();
      const t2 = (await refresh(t1.refresh_token)).body as Record<string, string>;
      clock += 30 * 1000;
      expect((await refresh(t1.refresh_token)).body.error).toBe('invalid_grant');
      expect(await svc.verifyAccessToken(t2.access_token, RESOURCE)).not.toBeNull();
    });

    it('reuse of a rotated refresh token after the grace window revokes the whole grant', async () => {
      const t1 = await tokens();
      const t2 = (await refresh(t1.refresh_token)).body as Record<string, string>;
      clock += 61 * 1000;
      expect((await refresh(t1.refresh_token)).body.error).toBe('invalid_grant');
      expect(await svc.verifyAccessToken(t2.access_token, RESOURCE)).toBeNull();
      expect((await refresh(t2.refresh_token)).body.error).toBe('invalid_grant');
    });

    it.each([
      ['wrong client', { client_id: 'https://chatgpt.com/oauth/x/client.json' }],
      ['wrong resource', { resource: 'https://other.example/mcp' }],
    ])('rejects %s', async (_l, extra) => {
      const t1 = await tokens();
      expect((await refresh(t1.refresh_token, extra)).body.error).toBe('invalid_grant');
    });

    it('rejects an access token used as a refresh token, and expired refresh tokens', async () => {
      const t1 = await tokens();
      expect((await refresh(t1.access_token)).body.error).toBe('invalid_grant');
      clock += 30 * 24 * 60 * 60 * 1000 + 1;
      expect((await refresh(t1.refresh_token)).body.error).toBe('invalid_grant');
    });
  });

  describe('verifyAccessToken', () => {
    let access: string;
    beforeEach(async () => {
      const { code, verifier } = await approvedCode();
      access = (await exchange(code, verifier)).body.access_token as string;
    });

    it('returns the owner and scopes for a valid token', async () => {
      expect(await svc.verifyAccessToken(access, RESOURCE)).toMatchObject({ userId: OWNER, scopes: ['finance:read', 'finance:write'] });
    });

    it('rejects other resources, expiry, owner changes and non-access tokens', async () => {
      expect(await svc.verifyAccessToken(access, 'https://preview.example/mcp')).toBeNull();
      expect(await svc.verifyAccessToken('fmcp_at_unknown', RESOURCE)).toBeNull();
      expect(await svc.verifyAccessToken('static-token', RESOURCE)).toBeNull();
      owner = OTHER;
      expect(await svc.verifyAccessToken(access, RESOURCE)).toBeNull();
      owner = OWNER;
      clock += 3600 * 1000 + 1;
      expect(await svc.verifyAccessToken(access, RESOURCE)).toBeNull();
    });

    it('revoke (RFC 7009) and revokeAll disconnect the grant', async () => {
      await svc.revoke(access);
      expect(await svc.verifyAccessToken(access, RESOURCE)).toBeNull();

      const { code, verifier } = await approvedCode();
      const second = (await exchange(code, verifier)).body.access_token as string;
      expect(await svc.listGrants(OWNER)).toHaveLength(1);
      expect(await svc.revokeAll(OWNER)).toBe(1);
      expect(await svc.verifyAccessToken(second, RESOURCE)).toBeNull();
      expect(await svc.listGrants(OWNER)).toHaveLength(0);
    });

    it('a read-only grant carries only finance:read', async () => {
      const { code, verifier } = await approvedCode({ scope: 'finance:read' });
      const ro = (await exchange(code, verifier)).body;
      expect(ro.scope).toBe('finance:read');
      expect((await svc.verifyAccessToken(ro.access_token as string, RESOURCE))?.scopes).toEqual(['finance:read']);
    });
  });
});
