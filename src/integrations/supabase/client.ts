import { createClient } from '@supabase/supabase-js';
import { sessionStorageAdapter } from '@/lib/sessionStorage';
import { resolveClientSupabaseConfig } from '@/lib/supabaseConfig';

const { url: supabaseUrl, key: supabaseAnonKey } = resolveClientSupabaseConfig(import.meta.env);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
  },
});
