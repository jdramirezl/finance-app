/**
 * API Client for Backend Communication
 *
 * Centralized fetch-based client for the Express backend. Attaches a
 * Supabase JWT to every request, parses JSON responses, and converts
 * any failure into a typed AppError carrying the originating HTTP
 * status (or 0 for network/runtime errors).
 */

import { supabase } from '../lib/supabase';
import { AppError } from '../errors/AppError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ErrorBody = {
  message?: string;
};

type RequestContext = {
  method: HttpMethod;
  path: string;
  payloadSize?: number;
};

class ApiClient {
  private readonly baseURL: string;

  private cachedToken: string | null = null;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // Cache the token from auth state changes instead of calling
    // getSession() per-request (which uses navigator.locks and can hang).
    supabase.auth.getSession().then(({ data: { session } }) => {
      this.cachedToken = session?.access_token ?? null;
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      this.cachedToken = session?.access_token ?? null;
    });
  }

  /**
   * Get authentication token from cache (set by onAuthStateChange).
   */
  private getAuthToken(): string | null {
    return this.cachedToken;
  }

  /**
   * Build headers with authentication.
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Translate an unknown thrown value into a typed AppError.
   *
   * - AppError: re-thrown as-is so the original status code and server
   *   message survive.
   * - TypeError: fetch raises this for network-level failures (DNS
   *   failure, offline, CORS rejection). Mapped to status 0.
   * - Error: every other runtime failure is wrapped with status 0 to
   *   keep callers exclusively dealing with AppError.
   * - unknown: stringified into an AppError as a last resort.
   */
  private handleError(error: unknown, context: RequestContext): never {
    const prefix = `${context.method} ${context.path}`;

    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new AppError(0, `${prefix} failed: network error — unable to reach server`);
    }

    if (error instanceof Error) {
      throw new AppError(0, `${prefix} failed: ${error.message}`);
    }

    throw new AppError(0, `${prefix} failed: ${String(error)}`);
  }

  /**
   * Handle a successful (2xx) response by parsing the body.
   */
  private async parseSuccess<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  /**
   * Issue a fetch request and unwrap the JSON body, raising AppError
   * for any non-2xx status or transport failure.
   *
   * On 401, attempts a single token refresh. If refresh succeeds the
   * request is retried transparently. If refresh fails, a custom
   * `auth:session-expired` event is dispatched and a never-resolving
   * promise is returned to suppress downstream error toasts (the modal
   * handles the UX).
   */
  private async request<T>(
    method: HttpMethod,
    path: string,
    data?: Record<string, unknown>,
  ): Promise<T> {
    const body = data !== undefined ? JSON.stringify(data) : undefined;
    const context: RequestContext = {
      method,
      path,
      payloadSize: body !== undefined ? body.length : undefined,
    };

    if (!navigator.onLine) {
      throw new AppError(0, `Cannot ${method} ${path}: you are offline`);
    }

    try {
      const headers = this.buildHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(`${this.baseURL}${path}`, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) return this.parseSuccess<T>(response);

      // 401 — attempt one silent token refresh before failing.
      if (response.status === 401) {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();

        if (!refreshError && refreshData.session) {
          this.cachedToken = refreshData.session.access_token;
          const retryHeaders: Record<string, string> = {
            ...headers,
            Authorization: `Bearer ${refreshData.session.access_token}`,
          };
          const retryResponse = await fetch(`${this.baseURL}${path}`, {
            method,
            headers: retryHeaders,
            body,
          });
          if (retryResponse.ok) return this.parseSuccess<T>(retryResponse);
        }

        // Refresh failed or retry still 401 — throw so TanStack Query can handle it
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        throw new AppError(401, 'Session expired');
      }

      const errorBody = (await response.json().catch(() => ({}))) as ErrorBody;
      const serverMessage = errorBody.message ?? response.statusText;
      throw new AppError(
        response.status,
        `${method} ${path} failed: ${serverMessage}`,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError(0, `${method} ${path} timed out after 30s`);
      }
      return this.handleError(error, context);
    }
  }

  /**
   * GET request.
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * POST request.
   */
  async post<T>(path: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', path, data);
  }

  /**
   * PUT request.
   */
  async put<T>(path: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>('PUT', path, data);
  }

  /**
   * PATCH request.
   */
  async patch<T>(path: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>('PATCH', path, data);
  }

  /**
   * DELETE request.
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Health check.
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return this.get('/health');
  }
}

export const apiClient = new ApiClient();
export type { ApiClient };

// Expose to window for debugging in development only.
declare global {
  interface Window {
    apiClient?: ApiClient;
  }
}

if (import.meta.env.DEV) {
  window.apiClient = apiClient;
}
