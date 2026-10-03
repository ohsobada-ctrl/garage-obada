// Read-only preflight. Public API keys stay in memory and are never printed.
import { loadEnv } from 'vite';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/supabaseConfig.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { resolveSupabaseConfig } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const mode = process.env.NODE_ENV || 'production';
const env = { ...loadEnv(mode, process.cwd(), ['VITE_', 'LOVABLE_SUPABASE_']), ...process.env };
const release = process.argv.includes('--release');
try {
  const { url, key } = resolveSupabaseConfig(env);
  console.log(`Database: ${new URL(url).host}`);
  const checks = [
    ['Authentication', '/auth/v1/settings', 'GET'],
    ['Cars table', '/rest/v1/cars?select=id&limit=0', 'GET'],
    ['Notification inbox', '/rest/v1/notification_inbox?select=id&limit=0', 'GET'],
    ['Maintenance reminders', '/rest/v1/maintenance_reminders?select=id&limit=0', 'GET'],
    ['Push devices', '/rest/v1/push_devices?select=id&limit=0', 'GET'],
    ['Admin report function', '/rest/v1/rpc/garage_admin_report', 'POST'],
  ];
  let failed = false;
  for (const [label, path, method] of checks) {
    try {
      const response = await fetch(url + path, {
        method, headers: { apikey: key, 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: '{}' } : {}), signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      const accessDenied = result.code === '42501' || result.message === 'Admin access required';
      if (response.ok) console.log(`PASS ${label}`);
      else if (accessDenied) console.log(`PRESENT ${label}; authenticated access required`);
      else { failed = true; console.log(`FAIL ${label}: HTTP ${response.status}, ${result.code || 'request rejected'}`); }
    } catch { failed = true; console.log(`FAIL ${label}: network request failed`); }
  }
  if (release) {
    const publicKey = env.VITE_WEB_PUSH_PUBLIC_KEY || '';
    const bytes = Buffer.from(publicKey, 'base64url');
    if (bytes.length === 65 && bytes[0] === 4) console.log('PASS Web Push public key configured');
    else { failed = true; console.log('FAIL Web Push public key is missing or invalid'); }
    try {
      // A deployed dispatcher rejects unauthenticated probes without sending anything.
      const response = await fetch(`${url}/functions/v1/dispatch-notifications`, { signal: AbortSignal.timeout(15000) });
      if (response.status === 401 && await response.text() === 'Unauthorized') console.log('PASS Dispatcher deployed and protected');
      else { failed = true; console.log(`FAIL Dispatcher probe: HTTP ${response.status}`); }
    } catch { failed = true; console.log('FAIL Dispatcher: network request failed'); }
  }
  if (failed) {
    console.log('Do not release yet. Resolve the failed checks on THIS project and rerun. No data was changed.');
    process.exitCode = 1;
  } else console.log('Preflight passed. Still verify server secrets, scheduler, authenticated RLS and real-device delivery.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
