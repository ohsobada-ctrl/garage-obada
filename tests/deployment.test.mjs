import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createECDH } from 'node:crypto';
const run = (args = [], env = {}) => spawnSync(process.execPath, ['scripts/setup-push.mjs', ...args], {
  encoding: 'utf8', env: { ...process.env, SUPABASE_PROJECT_REF: '', WEB_PUSH_PUBLIC_KEY: '', WEB_PUSH_PRIVATE_KEY: '', WEB_PUSH_SUBJECT: '', NOTIFICATION_CRON_SECRET: '', ...env },
});
test('push deployment preview needs no credentials and does not contact the server', () => {
  const result = run(['--dry-run']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /No writes performed/);
});
test('push deployment refuses missing keys and a different project before any writes', () => {
  assert.match(run().stderr, /Set WEB_PUSH_PUBLIC_KEY/);
  assert.match(run([], { SUPABASE_PROJECT_REF: 'wrong-project' }).stderr, /project mismatch/);
});
test('push deployment refuses mismatched VAPID keys without exposing their values', () => {
  const first = createECDH('prime256v1'); first.generateKeys();
  const second = createECDH('prime256v1'); second.generateKeys();
  const privateKey = first.getPrivateKey().toString('base64url');
  const result = run([], { WEB_PUSH_PUBLIC_KEY: second.getPublicKey().toString('base64url'), WEB_PUSH_PRIVATE_KEY: privateKey, WEB_PUSH_SUBJECT: 'mailto:support@example.com', NOTIFICATION_CRON_SECRET: 'a'.repeat(43) });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /keys do not match/);
  assert.equal((result.stdout + result.stderr).includes(privateKey), false);
});
