import { createClient } from '@supabase/supabase-js';
import { sessionStorageAdapter } from '@/lib/sessionStorage';
import { resolveSupabaseConfig } from '@/lib/supabaseConfig';

const { url: supabaseUrl, key: supabaseAnonKey } = resolveSupabaseConfig(import.meta.env);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
  },
});
