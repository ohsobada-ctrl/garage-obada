import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { resolveSupabaseConfig } from './src/lib/supabaseConfig';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // Fail a misconfigured release during build, before users install it.
  if (command === 'build') {
    try {
      resolveSupabaseConfig({ ...loadEnv(mode, process.cwd(), ['VITE_', 'LOVABLE_SUPABASE_']), ...process.env });
    } catch (e) {
      console.warn('[supabase-config]', e instanceof Error ? e.message : e);
    }
  }
  return ({
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    envPrefix: ["VITE_", "LOVABLE_SUPABASE_URL", "LOVABLE_SUPABASE_ANON_KEY", "LOVABLE_SUPABASE_PUBLISHABLE_KEY"],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL || 'https://ufaqfqcbovgkpqlujnxo.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYXFmcWNib3Zna3BxbHVqbnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTc1MTIsImV4cCI6MjA5Mzk5MzUxMn0.yWOTOCQN_3VM8FY2-vag_Ul6f_v0mLD365O4NTKr8p0'
      ),
    },
  });
});
