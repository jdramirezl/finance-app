import { createClient } from '@supabase/supabase-js';

/**
 * Programmatic Supabase login for E2E tests.
 * Uses the Supabase REST API directly — no UI interaction needed.
 *
 * Requires a test user to exist in Supabase. Create one manually:
 *   1. Go to Supabase dashboard > Authentication > Users
 *   2. Create user with the email/password from your .env.test.e2e
 *   3. Confirm the email (or disable email confirmation for test project)
 */

export function getTestCredentials() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  return { email, password, supabaseUrl, supabaseAnonKey };
}

export function hasTestCredentials(): boolean {
  const { email, password, supabaseUrl, supabaseAnonKey } = getTestCredentials();
  return !!(email && password && supabaseUrl && supabaseAnonKey);
}

export async function loginTestUser() {
  const { email, password, supabaseUrl, supabaseAnonKey } = getTestCredentials();
  if (!email || !password || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing test credentials. Set TEST_USER_EMAIL, TEST_USER_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(`Test login failed: ${error.message}`);
  return data.session;
}
