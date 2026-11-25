/**
 * Where to send the user after login. Only same-app paths are allowed:
 * never `//host`, backslash tricks or absolute URLs (open redirect).
 */
export const safeReturnPath = (from: unknown): string =>
  typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\')
    ? from
    : '/';
