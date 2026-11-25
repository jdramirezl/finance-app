/**
 * Supabase (Postgres) implementation of OAuthStore. Tables come from
 * migrations/033_mcp_oauth.sql; RLS is on with no policies, so only the
 * backend's service key can read or write them.
 *
 * Single-use guarantees rely on conditional UPDATE … RETURNING: Postgres
 * applies the row update for exactly one concurrent caller.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError } from '../../../shared/errors/AppError';
import type {
  AuthorizationRecord,
  GrantRecord,
  NewAuthorization,
  NewGrant,
  OAuthStore,
  TokenRecord,
} from './store';

const AUTHZ = 'mcp_oauth_authorizations';
const GRANTS = 'mcp_oauth_grants';
const TOKENS = 'mcp_oauth_tokens';

type Row = Record<string, unknown>;

const date = (v: unknown): Date => new Date(v as string);
const dateOrNull = (v: unknown): Date | null => (v ? new Date(v as string) : null);

function check(error: { message: string } | null, op: string): void {
  if (error) {
    console.error({ scope: 'mcp-oauth', event: 'db_error', op, error: error.message });
    throw new DatabaseError(`OAuth store ${op} failed`);
  }
}

const toAuthorization = (r: Row): AuthorizationRecord => ({
  id: r.id as string,
  handleHash: r.handle_hash as string,
  clientId: r.client_id as string,
  redirectUri: r.redirect_uri as string,
  state: (r.state as string | null) ?? null,
  codeChallenge: r.code_challenge as string,
  scope: r.scope as string,
  resource: r.resource as string,
  issuer: r.issuer as string,
  status: r.status as AuthorizationRecord['status'],
  userId: (r.user_id as string | null) ?? null,
  codeHash: (r.code_hash as string | null) ?? null,
  grantId: (r.grant_id as string | null) ?? null,
  expiresAt: date(r.expires_at),
  createdAt: date(r.created_at),
});

const toGrant = (r: Row): GrantRecord => ({
  id: r.id as string,
  userId: r.user_id as string,
  clientId: r.client_id as string,
  scope: r.scope as string,
  resource: r.resource as string,
  issuer: r.issuer as string,
  createdAt: date(r.created_at),
  revokedAt: dateOrNull(r.revoked_at),
  lastUsedAt: dateOrNull(r.last_used_at),
});

const toToken = (r: Row): TokenRecord => ({
  tokenHash: r.token_hash as string,
  grantId: r.grant_id as string,
  kind: r.kind as TokenRecord['kind'],
  expiresAt: date(r.expires_at),
  usedAt: dateOrNull(r.used_at),
});

export class SupabaseOAuthStore implements OAuthStore {
  constructor(private readonly db: SupabaseClient) {}

  async createAuthorization(input: NewAuthorization): Promise<void> {
    const { error } = await this.db.from(AUTHZ).insert({
      handle_hash: input.handleHash,
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      state: input.state,
      code_challenge: input.codeChallenge,
      scope: input.scope,
      resource: input.resource,
      issuer: input.issuer,
      expires_at: input.expiresAt.toISOString(),
    });
    check(error, 'createAuthorization');
  }

  async findAuthorizationByHandle(handleHash: string): Promise<AuthorizationRecord | null> {
    const { data, error } = await this.db.from(AUTHZ).select('*').eq('handle_hash', handleHash).maybeSingle();
    check(error, 'findAuthorizationByHandle');
    return data ? toAuthorization(data) : null;
  }

  async findAuthorizationByCode(codeHash: string): Promise<AuthorizationRecord | null> {
    const { data, error } = await this.db.from(AUTHZ).select('*').eq('code_hash', codeHash).maybeSingle();
    check(error, 'findAuthorizationByCode');
    return data ? toAuthorization(data) : null;
  }

  async decideAuthorization(
    id: string,
    d: { status: 'approved' | 'denied'; userId: string; codeHash: string | null; expiresAt: Date },
  ): Promise<boolean> {
    const { data, error } = await this.db
      .from(AUTHZ)
      .update({
        status: d.status,
        user_id: d.userId,
        code_hash: d.codeHash,
        expires_at: d.expiresAt.toISOString(),
        decided_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id');
    check(error, 'decideAuthorization');
    return (data ?? []).length === 1;
  }

  async consumeCode(codeHash: string): Promise<AuthorizationRecord | null> {
    const { data, error } = await this.db
      .from(AUTHZ)
      .update({ status: 'used' })
      .eq('code_hash', codeHash)
      .eq('status', 'approved')
      .select('*');
    check(error, 'consumeCode');
    return data && data.length === 1 ? toAuthorization(data[0]) : null;
  }

  async setAuthorizationGrant(id: string, grantId: string): Promise<void> {
    const { error } = await this.db.from(AUTHZ).update({ grant_id: grantId }).eq('id', id);
    check(error, 'setAuthorizationGrant');
  }

  async createGrant(input: NewGrant): Promise<GrantRecord> {
    const { data, error } = await this.db
      .from(GRANTS)
      .insert({
        user_id: input.userId,
        client_id: input.clientId,
        scope: input.scope,
        resource: input.resource,
        issuer: input.issuer,
      })
      .select('*')
      .single();
    check(error, 'createGrant');
    return toGrant(data as Row);
  }

  async revokeGrant(id: string): Promise<void> {
    const { error } = await this.db
      .from(GRANTS)
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('revoked_at', null);
    check(error, 'revokeGrant');
  }

  async revokeAllGrantsForUser(userId: string): Promise<number> {
    const { data, error } = await this.db
      .from(GRANTS)
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)
      .select('id');
    check(error, 'revokeAllGrantsForUser');
    return (data ?? []).length;
  }

  async listActiveGrants(userId: string): Promise<GrantRecord[]> {
    const { data, error } = await this.db
      .from(GRANTS)
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });
    check(error, 'listActiveGrants');
    return (data ?? []).map(toGrant);
  }

  async touchGrant(id: string, at: Date): Promise<void> {
    const { error } = await this.db.from(GRANTS).update({ last_used_at: at.toISOString() }).eq('id', id);
    check(error, 'touchGrant');
  }

  async insertTokens(tokens: Omit<TokenRecord, 'usedAt'>[]): Promise<void> {
    const { error } = await this.db.from(TOKENS).insert(
      tokens.map((t) => ({
        token_hash: t.tokenHash,
        grant_id: t.grantId,
        kind: t.kind,
        expires_at: t.expiresAt.toISOString(),
      })),
    );
    check(error, 'insertTokens');
  }

  async findToken(tokenHash: string): Promise<(TokenRecord & { grant: GrantRecord }) | null> {
    const { data, error } = await this.db
      .from(TOKENS)
      .select(`*, grant:${GRANTS}(*)`)
      .eq('token_hash', tokenHash)
      .maybeSingle();
    check(error, 'findToken');
    if (!data || !data.grant) return null;
    return { ...toToken(data), grant: toGrant(data.grant as Row) };
  }

  async markRefreshUsed(tokenHash: string, at: Date): Promise<boolean> {
    const { data, error } = await this.db
      .from(TOKENS)
      .update({ used_at: at.toISOString() })
      .eq('token_hash', tokenHash)
      .eq('kind', 'refresh')
      .is('used_at', null)
      .select('token_hash');
    check(error, 'markRefreshUsed');
    return (data ?? []).length === 1;
  }

  async purgeExpired(before: Date): Promise<void> {
    const cutoff = before.toISOString();
    const a = await this.db.from(AUTHZ).delete().lt('expires_at', cutoff);
    check(a.error, 'purgeExpired.authorizations');
    const t = await this.db.from(TOKENS).delete().lt('expires_at', cutoff);
    check(t.error, 'purgeExpired.tokens');
  }
}
