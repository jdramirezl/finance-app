import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** 256-bit random secret, base64url, with an optional type prefix. */
export const randomSecret = (prefix = ''): string => prefix + randomBytes(32).toString('base64url');

/** Only hashes are stored; raw tokens, codes and request handles never touch the database. */
export const hashSecret = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

/** An S256 challenge is base64url(SHA-256(verifier)): always 43 characters. */
export const isS256Challenge = (challenge: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(challenge);

/** RFC 7636 §4.6 check, constant-time on the encoded digest. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier) || !isS256Challenge(challenge)) return false;
  const computed = Buffer.from(createHash('sha256').update(verifier, 'ascii').digest('base64url'));
  const expected = Buffer.from(challenge);
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}
