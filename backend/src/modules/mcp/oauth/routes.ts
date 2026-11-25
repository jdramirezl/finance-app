/**
 * HTTP surface of the MCP OAuth server.
 *
 *   GET  /.well-known/oauth-protected-resource[/mcp]   RFC 9728 metadata
 *   GET  /.well-known/oauth-authorization-server       RFC 8414 metadata
 *   GET  /oauth/authorize                              start (→ consent page)
 *   POST /oauth/token                                  code / refresh exchange
 *   POST /oauth/revoke                                 RFC 7009
 *   GET  /oauth/requests/:handle            (Supabase session) consent details
 *   POST /oauth/requests/:handle/decision   (Supabase session) approve / deny
 *   GET  /api/mcp/grants                    (Supabase session) active connections
 *   POST /api/mcp/grants/revoke-all         (Supabase session) disconnect ChatGPT
 */
import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';
import { getSupabaseClient } from '../../../shared/infrastructure/supabaseClient';
import { FINANCE_SCOPES, publicBaseUrl, resourceUrl } from './config';
import { ClientMetadataResolver } from './clientMetadata';
import { OAuthService } from './service';
import { SupabaseOAuthStore } from './supabaseStore';

export type ServiceProvider = () => OAuthService;

let defaultService: OAuthService | null = null;
const clientResolver = new ClientMetadataResolver();

/** Lazily built so importing this module never needs Supabase credentials. */
export const getDefaultOAuthService: ServiceProvider = () => {
  defaultService ??= new OAuthService({ store: new SupabaseOAuthStore(getSupabaseClient()), clients: clientResolver });
  return defaultService;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const noStore = (res: Response) => res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });

/** Wraps async handlers; unexpected errors become a generic 500 (never details). */
const handle = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch((err) => {
      console.error({ scope: 'mcp-oauth', event: 'handler_failed', path: req.path, error: (err as Error).message });
      if (res.headersSent) return next(err);
      noStore(res).status(500).json({ error: 'server_error', error_description: 'Unexpected error' });
    });
  };

export interface OAuthRouterOptions {
  service?: ServiceProvider;
  /** Verifies the finance-app Supabase session and sets req.user. */
  authenticate?: RequestHandler;
}

export function createOAuthRouters(opts: OAuthRouterOptions = {}) {
  const service = opts.service ?? getDefaultOAuthService;
  const authenticate = opts.authenticate ?? authMiddleware;

  // ── discovery ─────────────────────────────────────────────────────
  const wellKnown = Router();

  const protectedResource = (req: Request, res: Response) => {
    const base = publicBaseUrl(req);
    res.set('Cache-Control', 'public, max-age=300').json({
      resource: resourceUrl(base),
      authorization_servers: [base],
      scopes_supported: [...FINANCE_SCOPES],
      bearer_methods_supported: ['header'],
      resource_name: 'Finance App',
      resource_documentation: 'https://github.com/jdramirezl/finance-app/blob/master/backend/docs/MCP.md',
    });
  };
  wellKnown.get('/oauth-protected-resource', protectedResource);
  wellKnown.get('/oauth-protected-resource/mcp', protectedResource);

  wellKnown.get('/oauth-authorization-server', (req, res) => {
    const base = publicBaseUrl(req);
    res.set('Cache-Control', 'public, max-age=300').json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      revocation_endpoint: `${base}/oauth/revoke`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
      scopes_supported: [...FINANCE_SCOPES, 'offline_access'],
    });
  });

  // ── OAuth endpoints ───────────────────────────────────────────────
  const oauth = Router();

  oauth.get('/authorize', handle(async (req, res) => {
    const base = publicBaseUrl(req);
    const outcome = await service().authorize(req.query as Record<string, unknown>, base, resourceUrl(base));
    noStore(res);
    if (outcome.kind === 'redirect') {
      res.redirect(302, outcome.location);
      return;
    }
    res.status(400).type('html').send(
      `<!doctype html><meta charset="utf-8"><title>Finance App</title>` +
      `<h1>No se puede conectar</h1><p>${escapeHtml(outcome.description)}</p>` +
      `<p><code>${escapeHtml(outcome.error)}</code></p>`,
    );
  }));

  oauth.post('/token', handle(async (req, res) => {
    const outcome = await service().token((req.body ?? {}) as Record<string, unknown>, publicBaseUrl(req));
    noStore(res).status(outcome.status).json(outcome.body);
  }));

  oauth.post('/revoke', handle(async (req, res) => {
    const token = (req.body ?? {}).token;
    await service().revoke(typeof token === 'string' ? token : undefined);
    noStore(res).status(200).end();
  }));

  oauth.get('/requests/:handle', authenticate, handle(async (req, res) => {
    const result = await service().getConsent(req.params.handle, req.user?.id ?? '');
    noStore(res);
    if (result.ok) {
      res.json(result.details);
    } else if (result.error === 'not_owner') {
      res.status(403).json({ error: 'not_owner', message: 'Esta cuenta no puede conectar ChatGPT' });
    } else {
      res.status(404).json({ error: 'not_found', message: 'La solicitud no existe o ya expiró' });
    }
  }));

  oauth.post('/requests/:handle/decision', authenticate, handle(async (req, res) => {
    const approve = (req.body ?? {}).approve === true;
    const result = await service().decide(req.params.handle, req.user?.id ?? '', approve);
    noStore(res);
    if (result.ok) {
      res.json({ redirectTo: result.redirectTo });
    } else if (result.error === 'not_owner') {
      res.status(403).json({ error: 'not_owner', message: 'Esta cuenta no puede conectar ChatGPT', redirectTo: result.redirectTo });
    } else {
      res.status(404).json({ error: 'not_found', message: 'La solicitud no existe o ya expiró' });
    }
  }));

  // ── connection management for the Settings page ───────────────────
  const grants = Router();

  grants.get('/', authenticate, handle(async (req, res) => {
    const list = await service().listGrants(req.user?.id ?? '');
    noStore(res).json({
      data: list.map((g) => ({
        id: g.id,
        clientId: g.clientId,
        scope: g.scope,
        createdAt: g.createdAt.toISOString(),
        lastUsedAt: g.lastUsedAt?.toISOString() ?? null,
      })),
    });
  }));

  grants.post('/revoke-all', authenticate, handle(async (req, res) => {
    const revoked = await service().revokeAll(req.user?.id ?? '');
    noStore(res).json({ revoked });
  }));

  return { wellKnown, oauth, grants };
}

