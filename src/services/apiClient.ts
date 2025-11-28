/**
 * API Client for Backend Communication
 * 
 * Provides a centralized way to communicate with the Express backend.
 * Handles authentication, error handling, and request/response formatting.
 */

import { supabase } from '../lib/supabase';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Get authentication token from Supabase
   */
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Build headers with authentication
   */
  private async buildHeaders(): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): never {
    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data?.message || 'Server error');
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from server');
    } else {
      // Something else happened
      throw new Error(error.message || 'Unknown error');
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string): Promise<T> {
    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.baseURL}${path}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * POST request
   */
  async post<T>(path: string, data?: any): Promise<T> {
    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.baseURL}${path}`, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * PUT request
   */
  async put<T>(path: string, data?: any): Promise<T> {
    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.baseURL}${path}`, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.baseURL}${path}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return this.get('/health');
  }
}

export const apiClient = new ApiClient();

// Expose to window for debugging (development only)
if (import.meta.env.DEV) {
  (window as any).apiClient = apiClient;
}
