import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React from 'react';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://garage.example' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
const { render, fireEvent, waitFor, cleanup } = await import('@testing-library/react');
const output = new URL(`./.generated-notification-${process.pid}.mjs`, import.meta.url);
const bundle = await build({ entryPoints: ['src/components/NotificationCenter.tsx'], bundle: true, write: false,
  platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } });
await writeFile(output, bundle.outputFiles[0].text);
const { NotificationCenter } = await import(output.href);
after(async () => { cleanup(); dom.window.close(); await unlink(output); });

const item = { id: 'notice-1', carId: 'system', carName: 'موعد صيانة البطارية', message: 'تذكير بتغيير البطارية', severity: 'info', type: 'legal', date: '2026-10-02T12:00:00Z', readAt: null };

test('preview is unread; opening the item records reading without a confirmation button', async () => {
  const calls = [];
  const view = render(React.createElement(NotificationCenter, { notifications: [item], onRead: async id => { calls.push(id); } }));
  assert.equal(view.queryByText('تأكيد القراءة'), null);
  assert.equal(calls.length, 0);
  fireEvent.click(view.getByRole('button', { expanded: false }));
  await waitFor(() => assert.deepEqual(calls, ['notice-1']));
  assert.equal(view.getByRole('button', { expanded: true }).getAttribute('aria-expanded'), 'true');
  view.unmount();
});
test('previously read items and local maintenance alerts never send read receipts', () => {
  const calls = [];
  for (const notification of [{ ...item, readAt: item.date }, { ...item, carId: 'car-1' }]) {
    const view = render(React.createElement(NotificationCenter, { notifications: [notification], onRead: async id => { calls.push(id); } }));
    fireEvent.click(view.getByRole('button', { expanded: false }));
    view.unmount();
  }
  assert.equal(calls.length, 0);
});
test('a notification opened from push waits for inbox data before marking read', async () => {
  const calls = [];
  const onRead = async id => { calls.push(id); };
  const view = render(React.createElement(NotificationCenter, { notifications: [], selectedId: item.id, onRead }));
  assert.equal(calls.length, 0);
  view.rerender(React.createElement(NotificationCenter, { notifications: [item], selectedId: item.id, onRead }));
  await waitFor(() => assert.deepEqual(calls, [item.id]));
  view.unmount();
});
