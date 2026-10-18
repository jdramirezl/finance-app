/**
 * Builds a fresh MCP server bound to one authenticated user.
 * Stateless: a new instance is created for every HTTP request.
 */
import { McpServer } from '@modelcontextprotocol/server';

export const MCP_SERVER_INFO = { name: 'finance-app', version: '1.0.0' } as const;

export function buildMcpServer(_userId: string): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, { capabilities: { tools: {} } });
  return server;
}
