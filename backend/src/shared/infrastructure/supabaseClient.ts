import { createClient, SupabaseClient } from '@supabase/supabase-js';

let instance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (instance) return instance;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('Supabase client not configured in test — provide a mock');
    }
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  instance = createClient(url, key);
  return instance;
}

/** For tests: reset the singleton so mocks can be injected */
export function resetSupabaseClient(): void {
  instance = null;
}
