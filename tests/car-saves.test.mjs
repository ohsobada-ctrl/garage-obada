import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createClient } from '@supabase/supabase-js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://garage.example' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
for (const key of ['HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'DocumentFragment', 'CustomEvent', 'MutationObserver', 'getComputedStyle']) globalThis[key] = dom.window[key];
const { render, fireEvent, waitFor, cleanup } = await import('@testing-library/react');
const output = new URL(`./.generated-car-${process.pid}.mjs`, import.meta.url);
const bundle = await build({ stdin: { contents: `export { AddCarDialog } from './src/components/AddCarDialog'; export { MileagePrompt } from './src/components/MileagePrompt'; export { updateOwnedCar, carFromRow } from './src/lib/carData';`, resolveDir: process.cwd() }, bundle: true, write: false,
  platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } });
await writeFile(output, bundle.outputFiles[0].text);
const { AddCarDialog, MileagePrompt, updateOwnedCar, carFromRow } = await import(output.href);
afterEach(cleanup);
after(async () => { dom.window.close(); await unlink(output); });

test('a car form waits for confirmed save, retains values on failure, and supports retry', async () => {
  let rejectSave;
  let attempts = 0;
  const view = render(React.createElement(AddCarDialog, { onAdd: () => {
    attempts++;
    return attempts === 1 ? new Promise((_resolve, reject) => { rejectSave = reject; }) : Promise.resolve();
  } }));
  fireEvent.click(view.getByRole('button', { name: 'أضف سيارة جديدة' }));
  fireEvent.change(view.getByLabelText('الشركة المصنعة'), { target: { value: 'تويوتا' } });
  fireEvent.change(view.getByLabelText('الموديل'), { target: { value: 'كامري' } });
  fireEvent.change(view.getByLabelText('سنة الصنع'), { target: { value: '2020' } });
  fireEvent.change(view.getByLabelText('العداد (كم)'), { target: { value: '50000' } });
  fireEvent.submit(view.getByLabelText('الشركة المصنعة').closest('form'));
  assert.ok(view.getByRole('dialog'));
  assert.equal(view.getByRole('button', { name: 'جاري الحفظ...' }).disabled, true);
  fireEvent.submit(view.getByLabelText('الشركة المصنعة').closest('form'));
  assert.equal(attempts, 1);
  rejectSave(new Error('الاتصال انقطع'));
  await waitFor(() => assert.equal(view.getByRole('alert').textContent, 'الاتصال انقطع'));
  assert.equal(view.getByLabelText('الشركة المصنعة').value, 'تويوتا');
  assert.equal(view.getByLabelText('العداد (كم)').value, '50000');
  fireEvent.submit(view.getByLabelText('الشركة المصنعة').closest('form'));
  await waitFor(() => {
    const dialog = view.queryByRole('dialog');
    assert.ok(!dialog || dialog.getAttribute('data-state') === 'closed');
  });
  assert.equal(attempts, 2);
});

const row = { id: 'car-1', user_id: 'owner-1', make: 'تويوتا', model: 'كامري', year: 2020, current_mileage: 10, last_mileage_update: null,
  created_at: '2026-01-01T00:00:00Z', settings: { oilRangeKm: 7000 }, legal_docs: [], oil_services: [], brake_tire_services: [], mileage_history: [] };

test('mileage prompt accepts cars loaded after mount and saves a valid zero reading', async () => {
  const calls = [];
  let closed = 0;
  const onUpdate = async (...args) => { calls.push(args); };
  const onClose = () => { closed++; };
  const view = render(React.createElement(MileagePrompt, { cars: [], open: false, onUpdate, onClose }));
  view.rerender(React.createElement(MileagePrompt, { cars: [carFromRow(row)], open: true, onUpdate, onClose }));
  await waitFor(() => assert.equal(view.getByRole('spinbutton').value, '10'));
  fireEvent.change(view.getByRole('spinbutton'), { target: { value: '0' } });
  fireEvent.submit(view.getByRole('spinbutton').closest('form'));
  await waitFor(() => assert.deepEqual(calls, [['car-1', 0]]));
  assert.equal(closed, 1);
});

function databaseClient(fetch) {
  return createClient('https://garage.example', 'public-test-key', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch } });
}
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

test('concurrent changes are reloaded and preserved when appending history', async () => {
  let current = structuredClone(row);
  let patches = 0;
  const client = databaseClient(async (input, init) => {
    const url = new URL(input);
    assert.equal(url.searchParams.get('id'), 'eq.car-1');
    assert.equal(url.searchParams.get('user_id'), 'eq.owner-1');
    if (init.method === 'GET') return response([current]);
    assert.equal(init.method, 'PATCH');
    patches++;
    if (patches === 1) {
      assert.equal(url.searchParams.get('mileage_history'), 'eq.[]');
      current.mileage_history = [{ id: 'another-device', mileage: 20, date: '2026-02-01' }];
      return response([]);
    }
    assert.equal(url.searchParams.get('mileage_history'), `eq.${JSON.stringify(current.mileage_history)}`);
    current = { ...current, ...JSON.parse(init.body) };
    return response([current]);
  });
  const saved = await updateOwnedCar(client, 'owner-1', 'car-1', car => ({ mileageHistory: [...car.mileageHistory, { id: 'this-device', mileage: 30, date: '2026-03-01' }] }));
  assert.equal(patches, 2);
  assert.deepEqual(saved.mileageHistory.map(item => item.id), ['another-device', 'this-device']);
  assert.equal(saved.settings.oilExpiryMonths, 6);
  assert.equal(saved.lastMileageUpdate, row.created_at);
});

test('missing rows and denied writes are reported as failures', async () => {
  const missing = databaseClient(async () => response([]));
  await assert.rejects(updateOwnedCar(missing, 'owner-1', 'gone', { currentMileage: 20 }), /لم تعد متاحة/);
  const denied = databaseClient(async (_url, init) => init.method === 'GET' ? response([row]) : response({ code: '42501', message: 'permission denied' }, 403));
  await assert.rejects(updateOwnedCar(denied, 'owner-1', 'car-1', { currentMileage: 20 }), error => error.code === '42501');
});
