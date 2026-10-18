/**
 * Builds a fresh MCP server bound to one authenticated user.
 * Stateless: a new instance is created for every HTTP request.
 */
import { McpServer } from '@modelcontextprotocol/server';
import { container, DependencyContainer } from 'tsyringe';
import { registerReadTools } from './readTools';

export const MCP_SERVER_INFO = { name: 'finance-app', version: '1.0.0' } as const;

export function buildMcpServer(userId: string, di: DependencyContainer = container): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    capabilities: { tools: {} },
    instructions:
      'Personal finance tools for a single user. Use finance_list_accounts and finance_list_pockets ' +
      'to discover ids before creating or filtering movements. Dates are YYYY-MM-DD.',
  });
  const ctx = { userId, di };
  registerReadTools(server, ctx);
  return server;
}
