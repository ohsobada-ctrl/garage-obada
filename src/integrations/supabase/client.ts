import { createClient } from '@supabase/supabase-js';

// Support both VITE_ and LOVABLE_ prefixes for maximum compatibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.LOVABLE_SUPABASE_URL || 'https://ufaqfqcbovgkpqlujnxo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.LOVABLE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYXFmcWNib3Zna3BxbHVqbnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTc1MTIsImV4cCI6MjA5Mzk5MzUxMn0.yWOTOCQN_3VM8FY2-vag_Ul6f_v0mLD365O4NTKr8p0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);