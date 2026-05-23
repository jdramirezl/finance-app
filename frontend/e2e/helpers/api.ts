import { loginTestUser } from './auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await loginTestUser();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${options.method || 'GET'} ${path} failed: ${res.status}`);
  return res.json();
}

export async function createTestAccount(overrides: Record<string, unknown> = {}) {
  return authFetch('/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ name: '[TEST] Account', color: '#3b82f6', currency: 'USD', ...overrides }),
  });
}

export async function createTestPocket(accountId: string, overrides: Record<string, unknown> = {}) {
  return authFetch('/api/pockets', {
    method: 'POST',
    body: JSON.stringify({ name: '[TEST] Pocket', accountId, type: 'normal', ...overrides }),
  });
}

export async function createTestMovement(accountId: string, pocketId: string, overrides: Record<string, unknown> = {}) {
  return authFetch('/api/movements', {
    method: 'POST',
    body: JSON.stringify({
      name: '[TEST] Movement',
      type: 'expense',
      amount: 100,
      accountId,
      pocketId,
      date: new Date().toISOString(),
      ...overrides,
    }),
  });
}

export async function deleteTestData() {
  const accounts = await authFetch('/api/accounts');
  for (const acct of accounts.filter((a: { name: string }) => a.name.startsWith('[TEST]'))) {
    // Cascade: removes pockets, sub-pockets, and movements in one call so
    // accounts created with pockets/movements can be cleaned up.
    await authFetch(`/api/accounts/${acct.id}/cascade`, {
      method: 'POST',
      body: JSON.stringify({ deleteMovements: true }),
    });
  }
}
