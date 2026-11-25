/**
 * ChatGPT (MCP OAuth) connection API: the consent screen and the
 * "Revocar acceso de ChatGPT" control in Settings.
 */
import { apiClient } from './apiClient';

export interface ConsentDetails {
  clientName: string;
  redirectHost: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
}

export interface McpGrant {
  id: string;
  clientId: string;
  scope: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Codes only ever go back to ChatGPT; refuse to navigate anywhere else. */
export const isSafeOAuthRedirect = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'chatgpt.com';
  } catch {
    return false;
  }
};

const requestPath = (handle: string) => `/oauth/requests/${encodeURIComponent(handle)}`;

export const mcpConnectionService = {
  getConsent: (handle: string) => apiClient.get<ConsentDetails>(requestPath(handle)),
  decide: (handle: string, approve: boolean) =>
    apiClient.post<{ redirectTo: string }>(`${requestPath(handle)}/decision`, { approve }),
  listGrants: async () => (await apiClient.get<{ data: McpGrant[] }>('/api/mcp/grants')).data,
  revokeAll: () => apiClient.post<{ revoked: number }>('/api/mcp/grants/revoke-all'),
};
