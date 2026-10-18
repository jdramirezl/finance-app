/**
 * MCP authentication (v1: static bearer token → single owner user).
 *
 * `verifyToken` is the single swap point for v2 (OAuth): replace it with a
 * JWT/introspection verifier that returns the token's subject user id.
 */
import { createHash, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      mcpUserId?: string;
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
 * Returns the user id the token acts as, or null if the token is invalid.
 * Constant-time: both sides are hashed to equal-length digests first.
 */
export function verifyToken(token: string): string | null {
  const expected = process.env.MCP_TOKEN;
  const ownerId = process.env.MCP_OWNER_USER_ID;
  if (!expected || !ownerId || !token) return null;
  return timingSafeEqual(sha256(token), sha256(expected)) ? ownerId : null;
}

function resourceMetadataUrl(req: Request): string {
  const proto = (req.get('x-forwarded-proto') ?? req.protocol).split(',')[0].trim();
  return `${proto}://${req.get('host')}/.well-known/oauth-protected-resource`;
}

export function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isMcpConfigured()) {
    // Fail closed: never serve tools without an explicit token + owner.
    res.status(500).json(mcpError('MCP_NOT_CONFIGURED', 'MCP server is not configured'));
    return;
  }

  const header = req.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const userId = match ? verifyToken(match[1].trim()) : null;

  if (!userId) {
    res
      .status(401)
      .set('WWW-Authenticate', `Bearer resource_metadata="${resourceMetadataUrl(req)}"`)
      .json(mcpError('UNAUTHORIZED', match ? 'Invalid bearer token' : 'Missing bearer token'));
    return;
  }

  req.mcpUserId = userId;
  next();
}
