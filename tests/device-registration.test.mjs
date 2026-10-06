import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/services/notificationService.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace(/^import .*\r?\n/gm, '')
  .replace(/import\.meta\.env\.VITE_WEB_PUSH_PUBLIC_KEY/g, "'test-key'")
  .replace('export const NotificationService', 'globalThis.NotificationService'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function nativeService({ save = async () => {}, legacyPermissionError = false } = {}) {
  const storage = new Map([['garage_device_id', 'device-1']]);
  const listeners = {};
  const state = { device: null, deleted: false, unregistered: false };
  const context = {
    crypto, setTimeout, clearTimeout, Event, Error, Promise,
    window: { dispatchEvent() {} },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
    PushNotifications: {
      checkPermissions: async () => ({ receive: 'granted' }),
      requestPermissions: async () => ({ receive: 'granted' }),
      createChannel: async () => {},
      addListener: async (name, callback) => { listeners[name] = callback; return { remove: async () => { delete listeners[name]; } }; },
      register: async () => { listeners.registration({ value: 'native-token' }); },
      unregister: async () => { state.unregistered = true; },
    },
    LocalNotifications: { getPending: async () => { if (legacyPermissionError) throw new Error('Local notifications blocked'); return { notifications: [] }; } },
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({
        upsert: async values => { await save(); state.device = values; return { error: null }; },
        delete: () => ({ eq: async () => { state.deleted = true; state.device = null; return { error: null }; } }),
      }),
    },
  };
  vm.runInNewContext(compiled, context);
  return { service: context.NotificationService, state, storage };
}

test('logout drains an in-flight device registration before detaching the device', async () => {
  const started = deferred();
  const finishSave = deferred();
  const { service, state, storage } = nativeService({ save: async () => { started.resolve(); await finishSave.promise; } });
  const enabled = service.enable(false).then(() => null, error => error);
  await started.promise;
  const disabled = service.disable();
  await assert.rejects(service.enable(), /انتظر/);
  assert.equal(state.deleted, false);
  finishSave.resolve();
  assert.match((await enabled).message, /إيقاف/);
  await disabled;
  assert.equal(state.device, null);
  assert.equal(state.unregistered, true);
  assert.equal(storage.get('garage_push_enabled'), 'false');
  assert.equal(storage.has('garage_device_id'), false);
});

test('legacy local notification permissions cannot turn successful Push registration into an error', async () => {
  const { service, state, storage } = nativeService({ legacyPermissionError: true });
  await service.enable();
  assert.equal(state.device.token, 'native-token');
  assert.equal(storage.get('garage_push_enabled'), 'true');
});
