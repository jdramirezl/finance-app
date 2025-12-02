/**
 * Global Error Handler Middleware
 * 
 * Handles all errors thrown in the application and returns appropriate HTTP responses.
 * 
 * Requirements: 1.5, 1.6, 18.1, 18.2, 18.3, 18.4, 18.6
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Global error handler
 * 
 * Catches all errors, logs them, and returns appropriate HTTP responses.
 * Operational errors (AppError) return their status code and message.
 * Unexpected errors return 500 with generic message in production.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with context
  console.error({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Handle operational errors (AppError instances)
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
}
