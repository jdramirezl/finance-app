/**
 * Authentication Middleware
 * 
 * Verifies Supabase JWT tokens and attaches user information to requests.
 * 
 * Requirements: 1.2, 1.3, 1.4
 */

import { Request, Response, NextFunction } from 'express';
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
 * Authentication middleware
 * 
 * Extracts JWT token from Authorization header, verifies it with Supabase,
 * and attaches user information to the request object.
 * 
 * @throws UnauthorizedError if token is missing or invalid
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch {
      throw new UnauthorizedError('Authentication service not configured');
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}
