import { loginTestUser } from './auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

interface TestItem {
  id: string;
  name?: string;
  notes?: string;
}

/**
 * Deletes all test data — rows with names starting with "[TEST]".
 * Calls the backend API with the test user's auth token.
 *
 * Endpoints have heterogeneous response shapes:
 *   - /api/accounts  -> plain array
 *   - /api/movements -> paginated { data, total, page, limit, hasMore }
 *
 * Accounts are deleted via the cascade endpoint so accounts with pockets
 * (and their movements) are removed in a single call.
 */
export async function cleanupTestData() {
  const session = await loginTestUser();
  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  // Movements first so account cascade has less to clean up.
  const movements = await fetchTestItems('/api/movements', authHeaders);
  for (const item of movements) {
    await fetch(`${BACKEND_URL}/api/movements/${item.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
  }

  const accounts = await fetchTestItems('/api/accounts', authHeaders);
  for (const item of accounts) {
    await fetch(`${BACKEND_URL}/api/accounts/${item.id}/cascade`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteMovements: true }),
    });
  }
}

async function fetchTestItems(
  endpoint: string,
  authHeaders: Record<string, string>
): Promise<TestItem[]> {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, { headers: authHeaders });
  if (!res.ok) return [];

  const response = await res.json();
  const items: TestItem[] = Array.isArray(response) ? response : (response.data ?? []);
  return items.filter(
    (item) => item.name?.startsWith('[TEST]') || item.notes?.startsWith('[TEST]')
  );
}
