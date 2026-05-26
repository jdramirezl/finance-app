/**
 * Authentication Middleware
 *
 * Verifies Supabase JWT tokens and attaches user information to requests.
 *
 * Verification strategy:
 *   1. If SUPABASE_JWT_SECRET is configured, verify the token locally with
 *      jsonwebtoken. This avoids a network round-trip on every request and
 *      is the preferred path in production.
 *   2. Otherwise, fall back to `supabase.auth.getUser(token)` so the app
 *      keeps working in environments where the JWT secret is not provisioned
 *      (e.g. existing deployments that have not been updated yet).
 *
 * Requirements: 1.2, 1.3, 1.4
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { SupabaseClient } from '@supabase/supabase-js';
import { UnauthorizedError } from '../errors/AppError';
import { getSupabaseClient } from '../infrastructure/supabaseClient';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

/**
 * Shape of the relevant fields in a Supabase-issued JWT payload.
 */
interface SupabaseJwtPayload extends JwtPayload {
  sub?: string;
  email?: string;
}

/**
 * Verify the token locally using the shared HMAC secret.
 *
 * Throws UnauthorizedError on any verification failure (expired, bad
 * signature, malformed, missing `sub`).
 */
function verifyTokenLocally(
  token: string,
  secret: string
): { id: string; email?: string } {
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  if (typeof decoded === 'string') {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const payload = decoded as SupabaseJwtPayload;
  if (!payload.sub) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  return {
    id: payload.sub,
    email: payload.email,
  };
}

/**
 * Verify the token by calling Supabase Auth. Used only when no local JWT
 * secret is configured.
 */
async function verifyTokenWithSupabase(
  token: string
): Promise<{ id: string; email?: string }> {
  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseClient();
  } catch {
    throw new UnauthorizedError('Authentication service not configured');
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Authentication middleware
 *
 * Extracts JWT token from Authorization header, verifies it (locally when
 * SUPABASE_JWT_SECRET is set, otherwise via the Supabase Auth API), and
 * attaches user information to the request object.
 *
 * @throws UnauthorizedError if token is missing or invalid
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.warn('[AUTH] ⚠️ SUPABASE_JWT_SECRET not set — using slow network verification');
    }
    const user = jwtSecret
      ? verifyTokenLocally(token, jwtSecret)
      : await verifyTokenWithSupabase(token);

    // Attach user information to request
    req.user = user;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}
