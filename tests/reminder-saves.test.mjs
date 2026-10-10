import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
const source = await readFile(new URL('../src/lib/reminderData.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { saveReminder } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const form = { name: 'البطارية', part_year: 2025, notes: '', remind_at: new Date(Date.now() + 86400000).toISOString(), repeat_days: 0 };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const client = fetch => createClient('https://garage.example', 'test', { auth: { storageKey: crypto.randomUUID(), persistSession: false, autoRefreshToken: false }, global: { fetch } });

test('retrying a reminder after a lost response keeps one record for the same draft', async () => {
  const records = new Map();
  let attempts = 0;
  const db = client(async (input, init) => {
    assert.equal(init.method, 'POST');
    assert.equal(new URL(input).searchParams.get('on_conflict'), 'id');
    const record = JSON.parse(init.body);
    assert.equal(record.user_id, 'owner');
    records.set(record.id, record);
    if (++attempts === 1) return reply({ message: 'response lost' }, 500);
    return reply([{ id: record.id }]);
  });
  await assert.rejects(saveReminder(db, 'owner', 'car', 'draft-id', form, false));
  await saveReminder(db, 'owner', 'car', 'draft-id', form, false);
  assert.equal(records.size, 1);
  assert.equal(attempts, 2);
});
test('editing a deleted reminder and invalid schedules never report success', async () => {
  let writes = 0;
  const db = client(async (input, init) => {
    writes++;
    assert.equal(init.method, 'PATCH');
    assert.equal(new URL(input).searchParams.get('user_id'), 'eq.owner');
    return reply([]);
  });
  await assert.rejects(saveReminder(db, 'owner', 'car', 'deleted', form, true), /لم يعد متاحاً/);
  await assert.rejects(saveReminder(db, 'owner', 'car', 'draft', { ...form, repeat_days: -1 }, false));
  await assert.rejects(saveReminder(db, 'owner', 'car', 'draft', { ...form, remind_at: 'invalid' }, false));
  assert.equal(writes, 1);
});
