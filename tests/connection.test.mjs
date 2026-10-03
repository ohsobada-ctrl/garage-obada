import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { resolveSupabaseConfig: resolve } = await loadTs('../src/lib/supabaseConfig.ts');
const { shouldRetryBackend } = await loadTs('../src/lib/backendError.ts');
const jwt = (ref, role = 'anon') => `header.${Buffer.from(JSON.stringify({ ref, role })).toString('base64url')}.signature`;

test('selects publishable keys and supports the previous anon configuration', () => {
  assert.equal(resolve({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }).key, 'sb_publishable_test');
  assert.equal(resolve({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: jwt('example') }).url, 'https://example.supabase.co');
  assert.equal(resolve({ LOVABLE_SUPABASE_URL: 'https://example.supabase.co', LOVABLE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }).key, 'sb_publishable_test');
});
test('missing configuration cannot silently connect to a different database', () => {
  assert.throws(() => resolve({}));
  assert.throws(() => resolve({ VITE_SUPABASE_URL: 'https://example.supabase.co', LOVABLE_SUPABASE_ANON_KEY: jwt('other') }));
  assert.throws(() => resolve({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: jwt('other') }));
});
test('private server keys cannot initialize the browser client', () => {
  for (const key of ['sb_secret_test', jwt('example', 'service_role')]) assert.throws(() => resolve({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: key }));
});
test('missing schema does not retry endlessly; transient outages can recover', () => {
  for (const code of ['PGRST202', 'PGRST205', '42501', 'PGRST301', 'PGRST303']) assert.equal(shouldRetryBackend(0, { code }), false);
  assert.equal(shouldRetryBackend(0, { message: 'Failed to fetch' }), true);
  assert.equal(shouldRetryBackend(2, { message: 'Failed to fetch' }), false);
});
