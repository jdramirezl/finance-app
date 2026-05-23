import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { hasTestCredentials, getTestCredentials, loginTestUser } from './helpers/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageStatePath = path.resolve(__dirname, '.auth/storage-state.json');

/**
 * Ensures the test user has a settings row so the dashboard can render.
 * Uses the service-role key to upsert directly, bypassing RLS.
 *
 * No-op when SUPABASE_SERVICE_KEY is not set — the caller is then expected
 * to have provisioned settings out-of-band.
 */
async function ensureTestUserSettings(userId: string): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('[e2e] SUPABASE_SERVICE_KEY not set; skipping settings upsert.');
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin
    .from('settings')
    .upsert({ user_id: userId, primary_currency: 'USD' }, { onConflict: 'user_id' });
  if (error) {
    throw new Error(`Failed to upsert settings for test user: ${error.message}`);
  }
}

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

  if (!hasTestCredentials()) {
    fs.writeFileSync(storageStatePath, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  // Programmatic login to discover the user id, then ensure default settings
  // exist before any spec runs. Without a settings row the dashboard 404s
  // on GET /api/settings and most pages fail to render.
  const session = await loginTestUser();
  await ensureTestUserSettings(session.user.id);

  const { email, password } = getTestCredentials();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/');

  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}
