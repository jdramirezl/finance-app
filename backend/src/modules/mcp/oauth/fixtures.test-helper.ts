/** Test fixtures for the MCP OAuth server (excluded from the build). */
import { createHash, randomBytes } from 'crypto';
import { ClientMetadataResolver } from './clientMetadata';

export const CHATGPT_CLIENT_ID = 'https://chatgpt.com/oauth/client.json';
export const CHATGPT_REDIRECT = 'https://chatgpt.com/connector_platform_oauth_redirect';

/** ChatGPT's real CIMD document as served on 2026-11-20. */
export const CHATGPT_CIMD = {
  client_id: CHATGPT_CLIENT_ID,
  client_uri: 'https://chatgpt.com/',
  redirect_uris: [CHATGPT_REDIRECT],
  token_endpoint_auth_method: 'private_key_jwt',
  token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
  grant_types: ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:jwt-bearer'],
  response_types: ['code'],
  client_name: 'ChatGPT',
  logo_uri: 'https://persistent.oaistatic.com/sonic/misc/openai-logo.png',
  token_endpoint_auth_signing_alg: 'RS256',
  jwks_uri: 'https://chatgpt.com/oauth/jwks.json',
};

/** Resolver whose network fetch serves `docs[url]` (404 otherwise) and records every URL fetched. */
export function fakeResolver(docs: Record<string, unknown> = { [CHATGPT_CLIENT_ID]: CHATGPT_CIMD }) {
  const fetched: string[] = [];
  const resolver = new ClientMetadataResolver(async (url) => {
    fetched.push(url);
    const doc = docs[url];
    return {
      ok: doc !== undefined,
      headers: new Headers(),
      text: async () => JSON.stringify(doc ?? {}),
    } as unknown as Response;
  });
  return { resolver, fetched };
}

export function pkcePair() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}
