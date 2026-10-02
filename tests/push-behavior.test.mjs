import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

test('Arabic and emoji push previews stay under provider payload limits', async () => {
  const source = await readFile(new URL('../supabase/functions/dispatch-notifications/payload.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  const { pushPreview } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  const message = { id: 'test-id', title: '🚗'.repeat(120), body: 'بطارية 🔋'.repeat(500) };
  const preview = pushPreview(message);
  assert.ok(Buffer.byteLength(JSON.stringify(preview), 'utf8') < 3000);
  assert.ok(preview.body.endsWith('…'));
  assert.equal(message.title, '🚗'.repeat(120));
});

test('push opens its own notification and never navigates to another origin', async () => {
  const handlers = {};
  const displayed = [];
  const opened = [];
  const context = {
    URL, encodeURIComponent,
    self: { location: { origin: 'https://garage.example' },
      addEventListener: (name, callback) => { handlers[name] = callback; },
      registration: { showNotification: async (title, options) => displayed.push({ title, options }) },
      clients: { matchAll: async () => [], openWindow: async url => opened.push(url) },
    },
  };
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
  let pending;
  const waitUntil = promise => { pending = promise; };
  handlers.push({ data: { json: () => ({ id: 'a/b', title: 'Battery', body: 'Due' }) }, waitUntil });
  await pending;
  assert.equal(displayed[0].options.data.url, '/?notification=a%2Fb');
  handlers.notificationclick({ notification: { close() {}, data: displayed[0].options.data }, waitUntil });
  await pending;
  assert.equal(opened[0], 'https://garage.example/?notification=a%2Fb');
  handlers.notificationclick({ notification: { close() {}, data: { url: 'https://external.example' } }, waitUntil });
  await pending;
  assert.equal(opened[1], 'https://garage.example/');
});
