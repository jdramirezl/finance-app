/**
 * MCP Streamable HTTP endpoint (stateless, JSON responses).
 *
 * POST /mcp            → JSON-RPC over HTTP, bearer auth required
 * GET / DELETE /mcp    → 405 (no SSE stream, no sessions)
 */
import { Router, Request, Response } from 'express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { container, DependencyContainer } from 'tsyringe';
import { bearerChallenge, createMcpAuth, mcpError } from './auth';
import { buildMcpServer } from './server';
import { getDefaultOAuthService, ServiceProvider } from './oauth/routes';

export interface McpRouterOptions {
  /** OAuth token verifier (defaults to the Supabase-backed service). */
  oauthService?: ServiceProvider;
  di?: DependencyContainer;
}

const methodNotAllowed = (_req: Request, res: Response) => {
  res.status(405).set('Allow', 'POST').json(mcpError('METHOD_NOT_ALLOWED', 'Use POST for MCP requests'));
};

export function createMcpRouter(opts: McpRouterOptions = {}): Router {
  const router = Router();

  router.post('/', createMcpAuth(opts.oauthService ?? getDefaultOAuthService), async (req: Request, res: Response) => {
    const server = buildMcpServer(req.mcpUserId as string, opts.di ?? container, {
      scopes: req.mcpScopes,
      insufficientScopeChallenge: bearerChallenge(req, {
        error: 'insufficient_scope',
        scope: 'finance:read finance:write',
        error_description: 'Reconnect and allow recording movements',
      }),
    });
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error({ scope: 'mcp', event: 'request_failed', error: (err as Error).message });
      if (!res.headersSent) {
        res.status(500).json(mcpError('INTERNAL_ERROR', 'MCP request failed', true));
      }
    }
  });

  router.get('/', methodNotAllowed);
  router.delete('/', methodNotAllowed);
  return router;
}

export default createMcpRouter();
