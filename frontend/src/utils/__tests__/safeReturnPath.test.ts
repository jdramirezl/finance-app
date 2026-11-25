import { describe, it, expect } from 'vitest';
import { safeReturnPath } from '../safeReturnPath';
import { isSafeOAuthRedirect } from '../../services/mcpConnectionService';

describe('safeReturnPath', () => {
  it.each([
    ['/oauth/consent?request=abc', '/oauth/consent?request=abc'],
    ['/settings', '/settings'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    [undefined, '/'],
    [42, '/'],
  ])('%p → %p', (input, expected) => {
    expect(safeReturnPath(input)).toBe(expected);
  });
});

describe('isSafeOAuthRedirect', () => {
  it.each([
    ['https://chatgpt.com/connector_platform_oauth_redirect?code=x', true],
    ['https://chatgpt.com/connector/oauth/abc?error=access_denied', true],
    ['http://chatgpt.com/connector_platform_oauth_redirect', false],
    ['https://chatgpt.com.evil.example/', false],
    ['javascript:alert(1)', false],
    ['not a url', false],
  ])('%s → %s', (url, expected) => {
    expect(isSafeOAuthRedirect(url)).toBe(expected);
  });
});
