/**
 * OAuth 2.1 authorization server logic for the MCP endpoint.
 *
 * Flow (authorization code + PKCE S256, public client, CIMD):
 *   authorize → consent (frontend, Supabase login, owner only) → code →
 *   token (code + verifier) → access + refresh → refresh (rotating).
 *
 * Owner-only is enforced twice: at consent/code exchange and on every token
 * use. Tokens are opaque, stored hashed, and bound to one resource (RFC 8707).
 */
import {
  consentPageUrl,
  FINANCE_SCOPES,
  grantedScopes,
  normalizeResource,
  TOKEN_PREFIX,
  TTL,
} from './config';
import { hashSecret, isS256Challenge, randomSecret, verifyPkceS256 } from './crypto';
import type { ClientMetadataResolver } from './clientMetadata';
import type { AuthorizationRecord, GrantRecord, OAuthStore } from './store';

export interface OAuthServiceDeps {
  store: OAuthStore;
  clients: Pick<ClientMetadataResolver, 'resolve'>;
  /** The only user allowed to approve or use tokens. Read per call so env changes apply. */
  ownerId?: () => string | undefined;
  now?: () => Date;
}

export type Params = Record<string, unknown>;

export type AuthorizeOutcome =
  | { kind: 'error_page'; error: string; description: string }
  | { kind: 'redirect'; location: string };

export type TokenOutcome = { status: number; body: Record<string, unknown> };

export type ConsentDetails = {
  clientName: string;
  redirectHost: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
};

export type ConsentLookup =
  | { ok: true; details: ConsentDetails }
  | { ok: false; error: 'not_found' | 'not_owner' };

export type DecisionOutcome =
  | { ok: true; redirectTo: string }
  | { ok: false; error: 'not_found' }
  | { ok: false; error: 'not_owner'; redirectTo: string };

export interface VerifiedAccess {
  userId: string;
  scopes: string[];
  grantId: string;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

const oauthError = (status: number, error: string, description: string): TokenOutcome => ({
  status,
  body: { error, error_description: description },
});

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ scope: 'mcp-oauth', event, ts: new Date().toISOString(), ...fields }));
}

export class OAuthService {
  private readonly store: OAuthStore;
  private readonly clients: Pick<ClientMetadataResolver, 'resolve'>;
  private readonly ownerId: () => string | undefined;
  private readonly now: () => Date;

  constructor(deps: OAuthServiceDeps) {
    this.store = deps.store;
    this.clients = deps.clients;
    this.ownerId = deps.ownerId ?? (() => process.env.MCP_OWNER_USER_ID);
    this.now = deps.now ?? (() => new Date());
  }

  private isOwner(userId: string | null | undefined): boolean {
    const owner = this.ownerId();
    return Boolean(owner && userId && userId === owner);
  }

  private redirectWith(base: string, params: Record<string, string | null | undefined>): string {
    const url = new URL(base);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    return url.toString();
  }

  // ── /oauth/authorize ────────────────────────────────────────────────

  async authorize(params: Params, issuer: string, resource: string): Promise<AuthorizeOutcome> {
    const clientId = str(params.client_id);
    const redirectUri = str(params.redirect_uri);
    // Client and redirect URI are checked before anything is redirected anywhere (no open redirect).
    if (!clientId) return { kind: 'error_page', error: 'invalid_request', description: 'Missing client_id' };
    const client = await this.clients.resolve(clientId);
    if (!client) return { kind: 'error_page', error: 'invalid_client', description: 'This client is not allowed' };
    if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
      return { kind: 'error_page', error: 'invalid_request', description: 'redirect_uri is not registered for this client' };
    }

    const state = str(params.state) ?? null;
    const fail = (error: string, description: string): AuthorizeOutcome => ({
      kind: 'redirect',
      location: this.redirectWith(redirectUri, { error, error_description: description, state, iss: issuer }),
    });

    if (params.response_type !== 'code') return fail('unsupported_response_type', 'Only response_type=code is supported');
    const challenge = str(params.code_challenge);
    if (params.code_challenge_method !== 'S256' || !challenge || !isS256Challenge(challenge)) {
      return fail('invalid_request', 'PKCE with code_challenge_method=S256 is required');
    }
    const requested = str(params.resource);
    if (requested && normalizeResource(requested) !== normalizeResource(resource)) {
      return fail('invalid_target', 'Unknown resource');
    }

    const handle = randomSecret();
    const now = this.now();
    await this.store.createAuthorization({
      handleHash: hashSecret(handle),
      clientId,
      redirectUri,
      state,
      codeChallenge: challenge,
      scope: grantedScopes(str(params.scope)).join(' '),
      resource,
      issuer,
      expiresAt: new Date(now.getTime() + TTL.authorizationRequestMs),
    });
    void this.store.purgeExpired(new Date(now.getTime() - 24 * 60 * 60 * 1000)).catch(() => undefined);
    log('authorize_started', { clientId });

    return { kind: 'redirect', location: this.redirectWith(consentPageUrl(), { request: handle }) };
  }

  // ── consent (called by the frontend with the user's Supabase session) ──

  private async pendingRequest(handle: string): Promise<AuthorizationRecord | null> {
    if (!handle) return null;
    const auth = await this.store.findAuthorizationByHandle(hashSecret(handle));
    if (!auth || auth.status !== 'pending' || auth.expiresAt <= this.now()) return null;
    return auth;
  }

  async getConsent(handle: string, userId: string): Promise<ConsentLookup> {
    const auth = await this.pendingRequest(handle);
    if (!auth) return { ok: false, error: 'not_found' };
    if (!this.isOwner(userId)) return { ok: false, error: 'not_owner' };
    const client = await this.clients.resolve(auth.clientId);
    return {
      ok: true,
      details: {
        clientName: client?.clientName ?? 'ChatGPT',
        redirectHost: new URL(auth.redirectUri).host,
        scopes: auth.scope.split(' '),
        createdAt: auth.createdAt.toISOString(),
        expiresAt: auth.expiresAt.toISOString(),
      },
    };
  }

  async decide(handle: string, userId: string, approve: boolean): Promise<DecisionOutcome> {
    const auth = await this.pendingRequest(handle);
    if (!auth) return { ok: false, error: 'not_found' };
    const denied = () => this.redirectWith(auth.redirectUri, {
      error: 'access_denied', error_description: 'The user denied access', state: auth.state, iss: auth.issuer,
    });

    if (!this.isOwner(userId)) {
      // Another finance-app user must never get a token. Burn the request so it can't be retried.
      await this.store.decideAuthorization(auth.id, { status: 'denied', userId, codeHash: null, expiresAt: auth.expiresAt });
      log('consent_rejected_not_owner', { userId });
      return { ok: false, error: 'not_owner', redirectTo: denied() };
    }

    if (!approve) {
      await this.store.decideAuthorization(auth.id, { status: 'denied', userId, codeHash: null, expiresAt: auth.expiresAt });
      log('consent_denied', { userId });
      return { ok: true, redirectTo: denied() };
    }

    const code = randomSecret(TOKEN_PREFIX.code);
    const won = await this.store.decideAuthorization(auth.id, {
      status: 'approved',
      userId,
      codeHash: hashSecret(code),
      expiresAt: new Date(this.now().getTime() + TTL.codeMs),
    });
    if (!won) return { ok: false, error: 'not_found' };
    log('consent_approved', { userId, clientId: auth.clientId });
    return { ok: true, redirectTo: this.redirectWith(auth.redirectUri, { code, state: auth.state, iss: auth.issuer }) };
  }

  // ── /oauth/token ────────────────────────────────────────────────────

  async token(params: Params, issuer: string): Promise<TokenOutcome> {
    const grantType = str(params.grant_type);
    if (grantType === 'authorization_code') return this.exchangeCode(params, issuer);
    if (grantType === 'refresh_token') return this.refresh(params, issuer);
    return oauthError(400, 'unsupported_grant_type', 'Use authorization_code or refresh_token');
  }

  private resourceMatches(requested: string | undefined, bound: string): boolean {
    return !requested || normalizeResource(requested) === normalizeResource(bound);
  }

  private async exchangeCode(params: Params, issuer: string): Promise<TokenOutcome> {
    const code = str(params.code);
    const clientId = str(params.client_id);
    const verifier = str(params.code_verifier);
    const redirectUri = str(params.redirect_uri);
    if (!code || !clientId || !verifier || !redirectUri) {
      return oauthError(400, 'invalid_request', 'code, client_id, redirect_uri and code_verifier are required');
    }

    const codeHash = hashSecret(code);
    const auth = await this.store.consumeCode(codeHash);
    if (!auth) {
      // Replayed code: revoke whatever it already produced (OAuth 2.1 §4.1.3).
      const previous = await this.store.findAuthorizationByCode(codeHash);
      if (previous?.status === 'used' && previous.grantId) {
        await this.store.revokeGrant(previous.grantId);
        log('code_replay_revoked', { grantId: previous.grantId });
      }
      return oauthError(400, 'invalid_grant', 'Invalid authorization code');
    }

    const valid =
      auth.expiresAt > this.now() &&
      auth.clientId === clientId &&
      auth.redirectUri === redirectUri &&
      auth.issuer === issuer &&
      this.resourceMatches(str(params.resource), auth.resource) &&
      verifyPkceS256(verifier, auth.codeChallenge) &&
      this.isOwner(auth.userId);
    if (!valid) {
      log('code_rejected', { clientId });
      return oauthError(400, 'invalid_grant', 'Invalid authorization code');
    }

    const grant = await this.store.createGrant({
      userId: auth.userId as string,
      clientId,
      scope: auth.scope,
      resource: auth.resource,
      issuer,
    });
    await this.store.setAuthorizationGrant(auth.id, grant.id);
    log('grant_created', { grantId: grant.id, userId: grant.userId, clientId });
    return this.issueTokens(grant);
  }

  private async refresh(params: Params, issuer: string): Promise<TokenOutcome> {
    const refreshToken = str(params.refresh_token);
    const clientId = str(params.client_id);
    if (!refreshToken || !clientId) return oauthError(400, 'invalid_request', 'refresh_token and client_id are required');

    const hash = hashSecret(refreshToken);
    const found = await this.store.findToken(hash);
    const invalid = oauthError(400, 'invalid_grant', 'Invalid refresh token');
    if (!found || found.kind !== 'refresh' || found.grant.revokedAt) return invalid;

    if (found.usedAt) {
      // A rotated refresh token came back. Within a short grace window this is
      // most likely a client retry or a concurrent refresh; after it, assume
      // the token leaked and kill the whole grant.
      if (this.now().getTime() - found.usedAt.getTime() > TTL.refreshReuseGraceMs) {
        await this.store.revokeGrant(found.grantId);
        log('refresh_reuse_revoked', { grantId: found.grantId });
      }
      return invalid;
    }
    // Lost a concurrent race for the same token: the winner gets the new pair.
    if (!(await this.store.markRefreshUsed(hash, this.now()))) return invalid;

    const { grant } = found;
    const valid =
      found.expiresAt > this.now() &&
      grant.clientId === clientId &&
      grant.issuer === issuer &&
      this.resourceMatches(str(params.resource), grant.resource) &&
      this.isOwner(grant.userId);
    if (!valid) return invalid;

    await this.store.touchGrant(grant.id, this.now());
    return this.issueTokens(grant);
  }

  private async issueTokens(grant: GrantRecord): Promise<TokenOutcome> {
    const access = randomSecret(TOKEN_PREFIX.access);
    const refresh = randomSecret(TOKEN_PREFIX.refresh);
    const now = this.now().getTime();
    await this.store.insertTokens([
      { tokenHash: hashSecret(access), grantId: grant.id, kind: 'access', expiresAt: new Date(now + TTL.accessTokenSec * 1000) },
      { tokenHash: hashSecret(refresh), grantId: grant.id, kind: 'refresh', expiresAt: new Date(now + TTL.refreshTokenSec * 1000) },
    ]);
    return {
      status: 200,
      body: {
        access_token: access,
        token_type: 'Bearer',
        expires_in: TTL.accessTokenSec,
        refresh_token: refresh,
        scope: grant.scope,
      },
    };
  }

  // ── /oauth/revoke (RFC 7009) and user-initiated revocation ─────────

  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    const found = await this.store.findToken(hashSecret(token));
    if (found) {
      await this.store.revokeGrant(found.grantId);
      log('grant_revoked', { grantId: found.grantId, via: 'revocation_endpoint' });
    }
  }

  async revokeAll(userId: string): Promise<number> {
    const count = await this.store.revokeAllGrantsForUser(userId);
    log('grants_revoked_all', { userId, count });
    return count;
  }

  listGrants(userId: string): Promise<GrantRecord[]> {
    return this.store.listActiveGrants(userId);
  }

  // ── resource server: /mcp ───────────────────────────────────────────

  async verifyAccessToken(token: string, resource: string): Promise<VerifiedAccess | null> {
    if (!token.startsWith(TOKEN_PREFIX.access)) return null;
    const found = await this.store.findToken(hashSecret(token));
    if (!found || found.kind !== 'access' || found.grant.revokedAt || found.expiresAt <= this.now()) return null;
    if (normalizeResource(found.grant.resource) !== normalizeResource(resource)) return null;
    if (!this.isOwner(found.grant.userId)) return null;
    const scopes = found.grant.scope.split(' ').filter((s) => (FINANCE_SCOPES as readonly string[]).includes(s));
    return { userId: found.grant.userId, scopes, grantId: found.grant.id };
  }
}
