import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/dispatch-notifications/index.ts', import.meta.url), 'utf8');
const worker = ts.transpileModule(source.replace(/^import .*\r?\n/gm, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

async function dispatch({ reminderError = null, beforeSend, owner = 'user-1' } = {}) {
  const tables = {
    push_devices: [{ id: 'device-1', user_id: owner, platform: 'web', enabled: true,
      updated_at: '2026-10-01T00:00:00Z', subscription: { endpoint: 'https://web.push.apple.com/token', keys: {} } }],
    notification_inbox: [{ id: 'message-1', user_id: 'user-1', title: 'Battery', body: 'Due' }],
    push_deliveries: [{ id: 1, notification_id: 'message-1', device_id: 'device-1', status: 'processing', attempts: 1,
      next_attempt_at: '2099-10-01T00:00:00Z' }],
  };
  const db = {
    rpc: async name => name === 'enqueue_due_reminders' ? { error: reminderError }
      : { data: structuredClone(tables.push_deliveries), error: null },
    from: table => {
      const filters = [];
      let update;
      const execute = () => {
        const rows = tables[table].filter(row => filters.every(filter => filter(row)));
        if (update) rows.forEach(row => Object.assign(row, update));
        return { data: structuredClone(rows), error: null };
      };
      const query = {
        select: () => query,
        update: values => { update = values; return query; },
        eq: (field, value) => { filters.push(row => row[field] === value); return query; },
        in: (field, values) => { filters.push(row => values.includes(row[field])); return query; },
        gte: (field, value) => { filters.push(row => row[field] >= value); return query; },
        lte: (field, value) => { filters.push(row => row[field] <= value); return query; },
        maybeSingle: async () => { const result = execute(); return { ...result, data: result.data[0] ?? null }; },
        then: (resolve, reject) => Promise.resolve(execute()).then(resolve, reject),
      };
      return query;
    },
  };
  let handler;
  let sends = 0;
  vm.runInNewContext(worker, {
    createClient: () => db, URL, Response, AbortSignal, Date, Error,
    console: { error() {} },
    Deno: { env: { get: () => 'test-config' }, serve: callback => { handler = callback; } },
    pushPreview: message => message,
    webpush: { sendNotification: async () => { sends++; await beforeSend?.(tables); } },
  });
  const response = await handler(new Request('https://worker.example', { method: 'POST', headers: { 'x-cron-secret': 'test-config' } }));
  return { tables, sends, response, result: await response.json() };
}

test('a reminder queue failure does not block an already queued admin message', async () => {
  const result = await dispatch({ reminderError: { code: '22008' } });
  assert.equal(result.response.status, 200);
  assert.equal(result.sends, 1);
  assert.equal(result.result.remindersQueued, false);
  assert.equal(result.tables.push_deliveries[0].status, 'accepted');
});

test('account mismatch skips delivery before contacting the provider', async () => {
  const result = await dispatch({ owner: 'another-user' });
  assert.equal(result.sends, 0);
  assert.equal(result.tables.push_deliveries[0].status, 'skipped');
});

test('expired endpoints are disabled, but a refreshed registration stays active and is retried', async () => {
  const expired = await dispatch({ beforeSend: () => { throw { statusCode: 410 }; } });
  assert.equal(expired.tables.push_devices[0].enabled, false);
  assert.equal(expired.tables.push_deliveries[0].status, 'failed');

  const refreshed = await dispatch({ beforeSend: tables => {
    tables.push_devices[0].updated_at = '2026-10-06T00:00:00Z';
    tables.push_devices[0].subscription.endpoint = 'https://web.push.apple.com/new-token';
    throw { statusCode: 410 };
  } });
  assert.equal(refreshed.tables.push_devices[0].enabled, true);
  assert.equal(refreshed.tables.push_deliveries[0].status, 'pending');
});

test('a delayed worker cannot overwrite a newer delivery lease', async () => {
  const result = await dispatch({ beforeSend: tables => {
    tables.push_deliveries[0].attempts = 2;
    tables.push_deliveries[0].status = 'pending';
  } });
  assert.equal(result.tables.push_deliveries[0].status, 'pending');
  assert.equal(result.tables.push_deliveries[0].attempts, 2);
});
