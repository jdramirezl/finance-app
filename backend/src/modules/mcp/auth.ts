/**
 * MCP authentication.
 *
 * Two credentials are accepted, checked in this order:
 *   1. The static `MCP_TOKEN` (Claude Desktop, Claude Code, scripts). Acts as
 *      `MCP_OWNER_USER_ID` with every scope. Unchanged from v1.
 *   2. An OAuth access token from our own authorization server (ChatGPT).
 *      Must be unexpired, unrevoked, bound to this resource, and belong to
 *      the owner. See ./oauth/.
 */
import { createHash, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { FINANCE_SCOPES, protectedResourceMetadataUrl, publicBaseUrl, resourceUrl, TOKEN_PREFIX } from './oauth/config';
import type { ServiceProvider } from './oauth/routes';

declare global {
  namespace Express {
    interface Request {
      mcpUserId?: string;
      /** Granted scopes; every scope for the static token. */
      mcpScopes?: string[];
    }
  }
}

export type McpErrorBody = { error: { code: string; message: string; retryable: boolean } };

export const mcpError = (code: string, message: string, retryable = false): McpErrorBody => ({
  error: { code, message, retryable },
});

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest();

export function isMcpConfigured(): boolean {
  return Boolean(process.env.MCP_TOKEN && process.env.MCP_OWNER_USER_ID);
}

/**
 * Static-token check. Returns the owner id, or null if the token is not the
 * configured `MCP_TOKEN`. Constant-time: both sides are hashed to equal-length
 * digests first.
 */
export function verifyToken(token: string): string | null {
  const expected = process.env.MCP_TOKEN;
  const ownerId = process.env.MCP_OWNER_USER_ID;
  if (!expected || !ownerId || !token) return null;
  return timingSafeEqual(sha256(token), sha256(expected)) ? ownerId : null;
}

/** `WWW-Authenticate` challenge pointing clients at our protected-resource metadata. */
export function bearerChallenge(req: Request, extra: Record<string, string> = {}): string {
  const params: Record<string, string> = {
    resource_metadata: protectedResourceMetadataUrl(publicBaseUrl(req)),
    scope: FINANCE_SCOPES.join(' '),
    ...extra,
  };
  return 'Bearer ' + Object.entries(params).map(([k, v]) => `${k}="${v.replace(/["\\]/g, '')}"`).join(', ');
}

export function createMcpAuth(getService: ServiceProvider): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!isMcpConfigured()) {
      // Fail closed: never serve tools without an explicit token + owner.
      res.status(500).json(mcpError('MCP_NOT_CONFIGURED', 'MCP server is not configured'));
      return;
    }

    const header = req.get('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    const token = match ? match[1].trim() : '';

    let userId: string | null = token ? verifyToken(token) : null;
    let scopes: string[] = [...FINANCE_SCOPES];

    // Only our own OAuth access tokens are looked up; anything else is rejected without a DB call.
    if (!userId && token.startsWith(TOKEN_PREFIX.access)) {
      try {
        const access = await getService().verifyAccessToken(token, resourceUrl(publicBaseUrl(req)));
        if (access) {
          userId = access.userId;
          scopes = access.scopes;
        }
      } catch (err) {
        console.error({ scope: 'mcp', event: 'token_verification_failed', error: (err as Error).message });
        res.status(503).json(mcpError('AUTH_UNAVAILABLE', 'Could not verify the access token', true));
        return;
      }
    }

    if (!userId) {
      const extra: Record<string, string> = match
        ? { error: 'invalid_token', error_description: 'The access token is invalid or expired' }
        : {};
      res
        .status(401)
        .set('WWW-Authenticate', bearerChallenge(req, extra))
        .json(mcpError('UNAUTHORIZED', match ? 'Invalid bearer token' : 'Missing bearer token'));
      return;
    }

    req.mcpUserId = userId;
    req.mcpScopes = scopes;
    next();
  };
}
