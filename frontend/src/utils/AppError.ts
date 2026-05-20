/**
 * Application error with an associated HTTP-style status code.
 *
 * Use statusCode 0 to represent non-HTTP failures (e.g., network errors,
 * unexpected runtime errors). For HTTP failures, statusCode mirrors the
 * server response status (4xx, 5xx).
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;

    // Restore prototype chain when targeting ES5 transpilation.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
