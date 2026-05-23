import { loginTestUser } from './auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Deletes all test data — rows with names starting with "[TEST]".
 * Calls the backend API with the test user's auth token.
 */
export async function cleanupTestData() {
  const session = await loginTestUser();

  const endpoints = ['/api/movements', '/api/accounts'];
  for (const endpoint of endpoints) {
    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) continue;

    const items = await res.json();
    const testItems = items.filter((item: { name?: string; notes?: string }) =>
      item.name?.startsWith('[TEST]') || item.notes?.startsWith('[TEST]')
    );

    for (const item of testItems) {
      await fetch(`${BACKEND_URL}${endpoint}/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
  }
}
