/**
 * API Client for Backend Communication
 *
 * Centralized fetch-based client for the Express backend. Attaches a
 * Supabase JWT to every request, parses JSON responses, and converts
 * any failure into a typed AppError carrying the originating HTTP
 * status (or 0 for network/runtime errors).
 */

import { supabase } from '../lib/supabase';
import { AppError } from '../utils/AppError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

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

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Get authentication token from Supabase.
   */
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  /**
   * Build headers with authentication.
   */
  private async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = await this.getAuthToken();
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
   * - Error: any other runtime failure is wrapped with status 0 to
   *   keep callers exclusively dealing with AppError.
   * - unknown: stringified into an AppError as a last resort.
   */
  private handleError(error: unknown, context: RequestContext): never {
    const prefix = `${context.method} ${context.path}`;
    const payloadSuffix =
      context.payloadSize !== undefined ? ` (payload: ${context.payloadSize} bytes)` : '';

    if (error instanceof AppError) {
      console.error(`API ${prefix} failed [${error.statusCode}]: ${error.message}${payloadSuffix}`);
      throw error;
    }

    if (error instanceof TypeError) {
      const message = `${prefix} failed: network error — unable to reach server`;
      console.error(`API ${message}${payloadSuffix}`, error);
      throw new AppError(0, message);
    }

    if (error instanceof Error) {
      const message = `${prefix} failed: ${error.message}`;
      console.error(`API ${message}${payloadSuffix}`, error);
      throw new AppError(0, message);
    }

    const message = `${prefix} failed: ${String(error)}`;
    console.error(`API ${message}${payloadSuffix}`);
    throw new AppError(0, message);
  }

  /**
   * Issue a fetch request and unwrap the JSON body, raising AppError
   * for any non-2xx status or transport failure.
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

    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.baseURL}${path}`, {
        method,
        headers,
        body,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as ErrorBody;
        const serverMessage = errorBody.message ?? response.statusText;
        throw new AppError(
          response.status,
          `${method} ${path} failed: ${serverMessage}`,
        );
      }

      // 204 No Content responses have no body.
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
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
