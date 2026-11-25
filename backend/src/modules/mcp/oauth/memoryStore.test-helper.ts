/**
 * In-memory OAuthStore for tests. Same atomicity contract as the Supabase
 * store (conditional updates succeed for exactly one caller).
 */
import { randomUUID } from 'crypto';
import type {
  AuthorizationRecord,
  GrantRecord,
  NewAuthorization,
  NewGrant,
  OAuthStore,
  TokenRecord,
} from './store';

export class MemoryOAuthStore implements OAuthStore {
  authorizations: AuthorizationRecord[] = [];
  grants: GrantRecord[] = [];
  tokens: TokenRecord[] = [];

  async createAuthorization(input: NewAuthorization) {
    this.authorizations.push({
      ...input, id: randomUUID(), status: 'pending', userId: null, codeHash: null, grantId: null, createdAt: new Date(),
    });
  }
  async findAuthorizationByHandle(handleHash: string) {
    return this.authorizations.find((a) => a.handleHash === handleHash) ?? null;
  }
  async findAuthorizationByCode(codeHash: string) {
    return this.authorizations.find((a) => a.codeHash === codeHash) ?? null;
  }
  async decideAuthorization(id: string, d: { status: 'approved' | 'denied'; userId: string; codeHash: string | null; expiresAt: Date }) {
    const a = this.authorizations.find((x) => x.id === id && x.status === 'pending');
    if (!a) return false;
    Object.assign(a, { status: d.status, userId: d.userId, codeHash: d.codeHash, expiresAt: d.expiresAt });
    return true;
  }
  async consumeCode(codeHash: string) {
    const a = this.authorizations.find((x) => x.codeHash === codeHash && x.status === 'approved');
    if (!a) return null;
    a.status = 'used';
    return { ...a };
  }
  async setAuthorizationGrant(id: string, grantId: string) {
    const a = this.authorizations.find((x) => x.id === id);
    if (a) a.grantId = grantId;
  }
  async createGrant(input: NewGrant) {
    const g: GrantRecord = { ...input, id: randomUUID(), createdAt: new Date(), revokedAt: null, lastUsedAt: null };
    this.grants.push(g);
    return { ...g };
  }
  async revokeGrant(id: string) {
    const g = this.grants.find((x) => x.id === id && !x.revokedAt);
    if (g) g.revokedAt = new Date();
  }
  async revokeAllGrantsForUser(userId: string) {
    const active = this.grants.filter((g) => g.userId === userId && !g.revokedAt);
    active.forEach((g) => { g.revokedAt = new Date(); });
    return active.length;
  }
  async listActiveGrants(userId: string) {
    return this.grants.filter((g) => g.userId === userId && !g.revokedAt).map((g) => ({ ...g }));
  }
  async touchGrant(id: string, at: Date) {
    const g = this.grants.find((x) => x.id === id);
    if (g) g.lastUsedAt = at;
  }
  async insertTokens(tokens: Omit<TokenRecord, 'usedAt'>[]) {
    tokens.forEach((t) => this.tokens.push({ ...t, usedAt: null }));
  }
  async findToken(tokenHash: string) {
    const t = this.tokens.find((x) => x.tokenHash === tokenHash);
    const grant = t && this.grants.find((g) => g.id === t.grantId);
    return t && grant ? { ...t, grant: { ...grant } } : null;
  }
  async markRefreshUsed(tokenHash: string, at: Date) {
    const t = this.tokens.find((x) => x.tokenHash === tokenHash && x.kind === 'refresh' && !x.usedAt);
    if (!t) return false;
    t.usedAt = at;
    return true;
  }
  async purgeExpired(before: Date) {
    this.authorizations = this.authorizations.filter((a) => a.expiresAt >= before);
    this.tokens = this.tokens.filter((t) => t.expiresAt >= before);
  }
}
