/**
 * Builds a fresh MCP server bound to one authenticated user.
 * Stateless: a new instance is created for every HTTP request.
 */
import { McpServer } from '@modelcontextprotocol/server';
import { container, DependencyContainer } from 'tsyringe';
import { registerReadTools } from './readTools';
import { registerWriteTools } from './writeTools';

export const MCP_SERVER_INFO = { name: 'finance-app', version: '1.0.0' } as const;

export interface McpAuthContext {
  /** Granted scopes; undefined means all (static token). */
  scopes?: string[];
  /** WWW-Authenticate value returned to clients that need finance:write. */
  insufficientScopeChallenge?: string;
}

export function buildMcpServer(userId: string, di: DependencyContainer = container, auth: McpAuthContext = {}): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    capabilities: { tools: {} },
    instructions:
      'Personal finance tools for a single user. Use finance_list_accounts and finance_list_pockets ' +
      'to discover ids before creating or filtering movements. Dates are YYYY-MM-DD.',
  });
  const ctx = { userId, di, ...auth };
  registerReadTools(server, ctx);
  registerWriteTools(server, ctx);
  return server;
}
