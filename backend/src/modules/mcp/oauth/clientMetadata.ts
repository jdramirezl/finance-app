/**
 * Fetches and validates a client's Client ID Metadata Document (CIMD).
 *
 * Only allow-listed client ids (ChatGPT's chatgpt.com URLs) are ever fetched.
 * The document must name itself, support public-client token exchange
 * (`none`), and list at least one chatgpt.com redirect URI.
 */
import { ALLOWED_REDIRECT_PREFIX, isAllowedClientId } from './config';

export interface ClientMetadata {
  clientId: string;
  clientName: string;
  redirectUris: string[];
}

type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'headers' | 'text'>>;

const MAX_BYTES = 32 * 1024;
const TIMEOUT_MS = 5000;

const supportsNone = (doc: Record<string, unknown>): boolean => {
  const methods = doc.token_endpoint_auth_methods_supported;
  if (Array.isArray(methods)) return methods.includes('none');
  return doc.token_endpoint_auth_method === 'none';
};

export function parseClientMetadata(clientId: string, doc: unknown): ClientMetadata | null {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  const d = doc as Record<string, unknown>;
  if (d.client_id !== clientId || !Array.isArray(d.redirect_uris) || !supportsNone(d)) return null;
  if (Array.isArray(d.grant_types) && !d.grant_types.includes('authorization_code')) return null;
  const redirectUris = d.redirect_uris.filter(
    (u): u is string => typeof u === 'string' && u.startsWith(ALLOWED_REDIRECT_PREFIX),
  );
  if (redirectUris.length === 0) return null;
  const clientName = typeof d.client_name === 'string' && d.client_name.trim() ? d.client_name.slice(0, 100) : 'ChatGPT';
  return { clientId, clientName, redirectUris };
}

export class ClientMetadataResolver {
  private readonly cache = new Map<string, { value: ClientMetadata; expiresAt: number }>();

  constructor(
    private readonly fetchImpl: FetchLike = (url, init) => fetch(url, init),
    private readonly now: () => number = Date.now,
    private readonly ttlMs = 60 * 60 * 1000,
  ) {}

  async resolve(clientId: string): Promise<ClientMetadata | null> {
    if (!isAllowedClientId(clientId)) return null;
    const hit = this.cache.get(clientId);
    if (hit && hit.expiresAt > this.now()) return hit.value;

    try {
      const res = await this.fetchImpl(clientId, {
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return null;
      if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return null;
      const text = await res.text();
      if (text.length > MAX_BYTES) return null;
      const value = parseClientMetadata(clientId, JSON.parse(text));
      if (value) this.cache.set(clientId, { value, expiresAt: this.now() + this.ttlMs });
      return value;
    } catch (err) {
      console.error({ scope: 'mcp-oauth', event: 'client_metadata_failed', clientId, error: (err as Error).message });
      return null;
    }
  }
}
