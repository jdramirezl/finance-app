/**
 * Persistence for the MCP OAuth server. Every secret is stored as a SHA-256
 * hash; the store never sees a raw token, code or request handle.
 */

export type AuthorizationStatus = 'pending' | 'approved' | 'denied' | 'used';

export interface AuthorizationRecord {
  id: string;
  handleHash: string;
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  scope: string;
  resource: string;
  issuer: string;
  status: AuthorizationStatus;
  userId: string | null;
  codeHash: string | null;
  grantId: string | null;
  /** Pending: consent deadline. Approved: code expiry. */
  expiresAt: Date;
  createdAt: Date;
}

export type NewAuthorization = Pick<
  AuthorizationRecord,
  'handleHash' | 'clientId' | 'redirectUri' | 'state' | 'codeChallenge' | 'scope' | 'resource' | 'issuer' | 'expiresAt'
>;

export interface GrantRecord {
  id: string;
  userId: string;
  clientId: string;
  scope: string;
  resource: string;
  issuer: string;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

export type NewGrant = Pick<GrantRecord, 'userId' | 'clientId' | 'scope' | 'resource' | 'issuer'>;

export interface TokenRecord {
  tokenHash: string;
  grantId: string;
  kind: 'access' | 'refresh';
  expiresAt: Date;
  /** Refresh tokens only: set when rotated. A second use means the token leaked. */
  usedAt: Date | null;
}

export interface OAuthStore {
  createAuthorization(input: NewAuthorization): Promise<void>;
  findAuthorizationByHandle(handleHash: string): Promise<AuthorizationRecord | null>;
  findAuthorizationByCode(codeHash: string): Promise<AuthorizationRecord | null>;
  /** Atomic pending → approved/denied. False if it was no longer pending. */
  decideAuthorization(
    id: string,
    decision: { status: 'approved' | 'denied'; userId: string; codeHash: string | null; expiresAt: Date },
  ): Promise<boolean>;
  /** Atomic approved → used. Returns the row only for the single winning caller. */
  consumeCode(codeHash: string): Promise<AuthorizationRecord | null>;
  setAuthorizationGrant(id: string, grantId: string): Promise<void>;

  createGrant(input: NewGrant): Promise<GrantRecord>;
  revokeGrant(id: string): Promise<void>;
  revokeAllGrantsForUser(userId: string): Promise<number>;
  listActiveGrants(userId: string): Promise<GrantRecord[]>;
  touchGrant(id: string, at: Date): Promise<void>;

  insertTokens(tokens: Omit<TokenRecord, 'usedAt'>[]): Promise<void>;
  findToken(tokenHash: string): Promise<(TokenRecord & { grant: GrantRecord }) | null>;
  /** Atomic: marks an unused refresh token used. False if it was already used. */
  markRefreshUsed(tokenHash: string, at: Date): Promise<boolean>;

  /** Housekeeping: drop authorizations and tokens that expired before `before`. */
  purgeExpired(before: Date): Promise<void>;
}
