import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), clear: () => values.clear() };
};
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = memoryStorage();
const source = await readFile(new URL('../src/lib/sessionStorage.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { sessionStorageAdapter: storage } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('remember me keeps refreshed sessions across browser sessions', () => {
  localStorage.clear(); sessionStorage.clear();
  storage.setItem('auth', 'original');
  storage.setItem('auth', 'refreshed');
  sessionStorage.clear();
  assert.equal(storage.getItem('auth'), 'refreshed');
  assert.equal(sessionStorage.getItem('auth'), null);
});
test('disabling remember me removes persistent credentials and sign out clears both stores', () => {
  localStorage.setItem('auth', 'old');
  localStorage.setItem('remember_me', 'false');
  storage.setItem('auth', 'temporary');
  assert.equal(localStorage.getItem('auth'), null);
  assert.equal(storage.getItem('auth'), 'temporary');
  sessionStorage.clear();
  assert.equal(storage.getItem('auth'), null);
  localStorage.setItem('remember_me', 'true');
  storage.setItem('auth', 'persistent');
  storage.removeItem('auth');
  assert.equal(localStorage.getItem('auth'), null);
  assert.equal(sessionStorage.getItem('auth'), null);
});
