/**
 * Base Application Error
 * 
 * All custom errors extend from this base class.
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, message);
  }
}

/**
 * A stock price could not be obtained from the provider and no cached
 * price exists to fall back on. 503 + PRICE_UNAVAILABLE so clients can
 * tell "try again later" apart from a server bug.
 */
export class PriceUnavailableError extends AppError {
  readonly code = 'PRICE_UNAVAILABLE';

  constructor(
    public readonly symbol: string,
    reason: string,
    public readonly retryable: boolean,
    public readonly retryAfterSeconds?: number
  ) {
    super(503, `Stock price for ${symbol} is temporarily unavailable (${reason})`);
  }
}
