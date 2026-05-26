import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable navigator.locks which hangs when Chrome DevTools is closed.
    // Safe for single-tab usage. Multi-tab token refresh may race but
    // won't corrupt state — worst case is a redundant refresh.
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => {
      return await fn();
    },
  },
});
