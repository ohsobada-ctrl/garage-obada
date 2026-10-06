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
  });
});
