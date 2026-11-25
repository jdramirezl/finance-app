/**
 * OAuth 2.1 configuration for the MCP endpoint (ChatGPT connector).
 *
 * Single-user design: this server is both the authorization server (AS) and
 * the resource server (RS) for `/mcp`. Only allow-listed clients (ChatGPT's
 * Client ID Metadata Document URLs) can start a flow, and only the owner
 * (`MCP_OWNER_USER_ID`) can ever approve one or use a token.
 */
import { Request } from 'express';

export const FINANCE_SCOPES = ['finance:read', 'finance:write'] as const;
export type FinanceScope = (typeof FINANCE_SCOPES)[number];

export const TTL = {
  /** Pending consent request (user must approve within this window). */
  authorizationRequestMs: 10 * 60 * 1000,
  /** Authorization code, single use. */
  codeMs: 2 * 60 * 1000,
  accessTokenSec: 60 * 60,
  /** Refresh tokens rotate on every use; each new one gets a fresh 30 days. */
  refreshTokenSec: 30 * 24 * 60 * 60,
  /** A rotated refresh token reused after this is treated as stolen (grant revoked). */
  refreshReuseGraceMs: 60 * 1000,
} as const;

export const TOKEN_PREFIX = {
  access: 'fmcp_at_',
  refresh: 'fmcp_rt_',
  code: 'fmcp_ac_',
} as const;

/**
 * ChatGPT identifies itself with a CIMD URL as `client_id`: the stable
 * `https://chatgpt.com/oauth/client.json`, or a callback-specific
 * `https://chatgpt.com/oauth/{callback_id}/client.json`. Nothing else may
 * start a flow, so the AS never fetches an attacker-chosen URL (no SSRF).
 */
const ALLOWED_CLIENT_ID = /^https:\/\/chatgpt\.com\/oauth\/(?:[A-Za-z0-9_-]{1,128}\/)?client\.json$/;
export const isAllowedClientId = (clientId: string): boolean => ALLOWED_CLIENT_ID.test(clientId);

/** Codes are only ever delivered to ChatGPT, even if its metadata listed more. */
export const ALLOWED_REDIRECT_PREFIX = 'https://chatgpt.com/';

/**
 * Public origin of this deployment (the OAuth issuer). `MCP_PUBLIC_URL`
 * overrides it; otherwise it comes from the request host, which on Vercel is
 * the domain the client actually called. Tokens are bound to the resource
 * derived from it, so a token minted on one deployment URL is rejected on
 * every other one (including previews, which share the database).
 */
export function publicBaseUrl(req: Request): string {
  const configured = process.env.MCP_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const proto = (req.get('x-forwarded-proto') ?? req.protocol).split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
}

export const resourceUrl = (base: string): string => `${base}/mcp`;
export const protectedResourceMetadataUrl = (base: string): string =>
  `${base}/.well-known/oauth-protected-resource/mcp`;

/** Frontend page that shows the consent screen (uses the normal finance-app login). */
export function consentPageUrl(): string {
  const configured = process.env.MCP_CONSENT_URL?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production'
    ? 'https://finance-app-five-navy.vercel.app/oauth/consent'
    : 'http://localhost:5173/oauth/consent';
}

/**
 * Requested scopes → granted scopes. Unknown scopes (e.g. `offline_access`,
 * OIDC scopes) are ignored; no finance scope means both. Write implies read.
 */
export function grantedScopes(requested: string | undefined): FinanceScope[] {
  const asked = new Set((requested ?? '').split(/\s+/).filter(Boolean));
  const known = FINANCE_SCOPES.filter((s) => asked.has(s));
  if (known.length === 0 || asked.has('finance:write')) return [...FINANCE_SCOPES];
  return known;
}

/** Canonical form for comparing resource indicators (RFC 8707): no trailing slash, lowercase origin. */
export function normalizeResource(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hash || url.search) return null;
    return `${url.protocol}//${url.host}`.toLowerCase() + url.pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}
