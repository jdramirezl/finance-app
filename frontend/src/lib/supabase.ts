import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Monitor authentication state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('🔐 User signed in:', session?.user?.email);
  } else if (event === 'SIGNED_OUT') {
    console.log('🔓 User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('🔄 Auth token refreshed');
  } else if (event === 'USER_UPDATED') {
    console.log('👤 User profile updated');
  }
});
