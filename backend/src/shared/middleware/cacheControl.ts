import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware factory that sets `Cache-Control` headers on GET responses.
 *
 * The header is set as `private, max-age=<maxAge>[, stale-while-revalidate=<staleWhileRevalidate>]`.
 * - `private` ensures shared caches (CDNs, proxies) do not store user-scoped responses.
 * - `max-age` controls how long the browser may serve the cached response without revalidation.
 * - `stale-while-revalidate` (when > 0) lets the browser serve a stale response while
 *   asynchronously revalidating in the background.
 *
 * Only GET requests receive the header — mutations (POST/PUT/PATCH/DELETE) are never cached.
 *
 * @param maxAge Seconds the response is considered fresh.
 * @param staleWhileRevalidate Seconds after expiration during which a stale response
 *   may be served while a background revalidation happens. Defaults to 0 (omitted).
 */
export function cacheControl(maxAge: number, staleWhileRevalidate: number = 0) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      const parts = [`private`, `max-age=${maxAge}`];
      if (staleWhileRevalidate > 0) {
        parts.push(`stale-while-revalidate=${staleWhileRevalidate}`);
      }
      res.setHeader('Cache-Control', parts.join(', '));
    }
    next();
  };
}
