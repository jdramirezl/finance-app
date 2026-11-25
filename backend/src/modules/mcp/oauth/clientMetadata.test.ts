import { ClientMetadataResolver, parseClientMetadata } from './clientMetadata';
import { CHATGPT_CIMD, CHATGPT_CLIENT_ID, CHATGPT_REDIRECT, fakeResolver } from './fixtures.test-helper';

describe('parseClientMetadata', () => {
  it("accepts ChatGPT's real CIMD document", () => {
    expect(parseClientMetadata(CHATGPT_CLIENT_ID, CHATGPT_CIMD)).toEqual({
      clientId: CHATGPT_CLIENT_ID,
      clientName: 'ChatGPT',
      redirectUris: [CHATGPT_REDIRECT],
    });
  });

  it.each([
    ['client_id mismatch', { ...CHATGPT_CIMD, client_id: 'https://chatgpt.com/oauth/other/client.json' }],
    ['no public-client auth', { ...CHATGPT_CIMD, token_endpoint_auth_methods_supported: ['private_key_jwt'] }],
    ['no redirect_uris', { ...CHATGPT_CIMD, redirect_uris: undefined }],
    ['only non-chatgpt redirects', { ...CHATGPT_CIMD, redirect_uris: ['https://evil.example/cb'] }],
    ['no authorization_code grant', { ...CHATGPT_CIMD, grant_types: ['refresh_token'] }],
    ['not an object', ['x']],
  ])('rejects %s', (_label, doc) => {
    expect(parseClientMetadata(CHATGPT_CLIENT_ID, doc)).toBeNull();
  });

  it('drops redirect URIs outside chatgpt.com', () => {
    const doc = { ...CHATGPT_CIMD, redirect_uris: ['https://evil.example/cb', CHATGPT_REDIRECT] };
    expect(parseClientMetadata(CHATGPT_CLIENT_ID, doc)?.redirectUris).toEqual([CHATGPT_REDIRECT]);
  });
});

describe('ClientMetadataResolver', () => {
  it.each([
    'https://evil.example/client.json',
    'http://chatgpt.com/oauth/client.json',
    'https://chatgpt.com.evil.example/oauth/client.json',
    'https://chatgpt.com/oauth/../../x/client.json',
    'https://chatgpt.com/oauth/client.json?x=1',
  ])('never fetches a non-allow-listed client id: %s', async (clientId) => {
    const { resolver, fetched } = fakeResolver({ [clientId]: { ...CHATGPT_CIMD, client_id: clientId } });
    expect(await resolver.resolve(clientId)).toBeNull();
    expect(fetched).toEqual([]);
  });

  it('accepts the callback-specific ChatGPT client id', async () => {
    const id = 'https://chatgpt.com/oauth/cb_123-abc/client.json';
    const { resolver } = fakeResolver({ [id]: { ...CHATGPT_CIMD, client_id: id } });
    expect(await resolver.resolve(id)).not.toBeNull();
  });

  it('caches a valid document', async () => {
    const { resolver, fetched } = fakeResolver();
    await resolver.resolve(CHATGPT_CLIENT_ID);
    await resolver.resolve(CHATGPT_CLIENT_ID);
    expect(fetched).toHaveLength(1);
  });

  it('returns null on network failure and oversized bodies', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = new ClientMetadataResolver(async () => { throw new Error('timeout'); });
    expect(await failing.resolve(CHATGPT_CLIENT_ID)).toBeNull();
    const huge = new ClientMetadataResolver(async () => ({
      ok: true,
      headers: new Headers({ 'content-length': '999999' }),
      text: async () => '{}',
    }) as unknown as Response);
    expect(await huge.resolve(CHATGPT_CLIENT_ID)).toBeNull();
    errSpy.mockRestore();
  });
});
